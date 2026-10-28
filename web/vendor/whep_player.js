/**
 * Aryorithm Air-Gapped WebRTC (WHEP) Player
 * Connects directly to local MediaMTX (port 8889) via native browser RTCPeerConnection.
 * Zero external CDN dependencies.
 */
class WhepVideoPlayer {
    constructor(videoElement, streamUrl) {
        this.videoElement = videoElement;
        this.streamUrl = streamUrl;
        this.pc = null;
    }

    async start() {
        this.pc = new RTCPeerConnection({
            iceServers: [] // 100% Air-Gapped Local Network: No external STUN/TURN
        });

        this.pc.addTransceiver("video", { direction: "recvonly" });
        this.pc.addTransceiver("audio", { direction: "recvonly" });

        this.pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                this.videoElement.srcObject = event.streams[0];
            } else {
                const stream = new MediaStream([event.track]);
                this.videoElement.srcObject = stream;
            }
        };

        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        try {
            const response = await fetch(this.streamUrl, {
                method: "POST",
                headers: { "Content-Type": "application/sdp" },
                body: offer.sdp
            });

            if (response.ok) {
                const answerSdp = await response.text();
                await this.pc.setRemoteDescription({
                    type: "answer",
                    sdp: answerSdp
                });
            } else {
                console.warn("[WHEP] Stream endpoint returned status:", response.status);
            }
        } catch (err) {
            console.warn("[WHEP] Local video stream offline or unreachable:", err);
        }
    }

    stop() {
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }
}
window.WhepVideoPlayer = WhepVideoPlayer;