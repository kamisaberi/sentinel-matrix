#!/usr/bin/env python3
import http.server
import math
import os
import subprocess
import sys
import threading
import time

anomaly_active = False

class AnomalyHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        global anomaly_active
        if "/anomaly" in self.path:
            if "action=trigger" in self.path:
                anomaly_active = True
                print("[!] [Thermal Camera] INJECTED THERMAL OVERHEAT ANOMALY (Bearing > 130°C)!")
            elif "action=reset" in self.path:
                anomaly_active = False
                print("[+] [Thermal Camera] Restored normal thermal baseline (65°C).")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        global anomaly_active
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        status_json = f'{{"anomaly_active": {"true" if anomaly_active else "false"}}}'
        self.wfile.write(status_json.encode())

def run_control_api():
    server = http.server.HTTPServer(("0.0.0.0", 8088), AnomalyHandler)
    server.serve_forever()

def generate_thermal_frame(frame_num, width=640, height=360):
    global anomaly_active
    header = f"P6\n{width} {height}\n255\n".encode("ascii")
    data = bytearray(width * height * 3)

    cx, cy = width // 2, height // 2
    hotspot_r = 50 + int(10 * math.sin(frame_num * 0.2)) if anomaly_active else 25

    for y in range(0, height, 2):
        for x in range(0, width, 2):
            dx, dy = x - cx, y - cy
            dist = math.sqrt(dx * dx + dy * dy)

            if anomaly_active and dist < hotspot_r:
                # Critical Overheat Hotspot: Glowing Red / White
                r, g, b = 255, int(200 * (1 - dist / hotspot_r)), 40
            elif dist < 110:
                # Normal Motor Body: Cyan / Blue / Green gradient (~65°C)
                r, g, b = int(40 + 20 * math.sin(x * 0.05)), int(140 + 30 * math.cos(y * 0.05)), 180
            else:
                # Ambient Cool Background (~22°C): Deep Navy
                r, g, b = 15, 25, 45

            # Fill 2x2 pixel blocks for speed
            for oy in range(2):
                for ox in range(2):
                    if y + oy < height and x + ox < width:
                        idx = ((y + oy) * width + (x + ox)) * 3
                        data[idx] = r
                        data[idx + 1] = g
                        data[idx + 2] = b

    return header + data

def main():
    threading.Thread(target=run_control_api, daemon=True).start()
    print("[+] Thermal Camera Anomaly Control API listening on :8088")

    # Pipe synthetic PPM frames directly into ffmpeg publishing to MediaMTX RTSP
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "image2pipe",
        "-vcodec", "ppm",
        "-r", "15",
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-pix_fmt", "yuv420p",
        "-f", "rtsp",
        "rtsp://127.0.0.1:8554/thermal_feed"
    ]

    print("[*] Connecting video pipe to MediaMTX RTSP...")
    time.sleep(2)
    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)

    frame = 0
    while True:
        frame += 1
        raw_ppm = generate_thermal_frame(frame)
        try:
            proc.stdin.write(raw_ppm)
            proc.stdin.flush()
        except Exception:
            break
        time.sleep(1.0 / 15.0)

if __name__ == "__main__":
    main()