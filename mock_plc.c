#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <pthread.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <signal.h>
#include <stdbool.h>

#if __has_include("plant_ode.h")
#include "plant_ode.h"
#elif __has_include("include/plant_ode.h")
#include "include/plant_ode.h"
#endif

#define DEFAULT_MODBUS_PORT 502
#define DEFAULT_S7COMM_PORT 102
#define DEFAULT_IEC104_PORT 2404
#define DEFAULT_SPOOL_DIR "/var/run/sentinel/honeynet_spool"
#define FALLBACK_SPOOL_DIR "./honeynet_spool"

typedef struct
{
    int modbus_port;
    int s7comm_port;
    int iec104_port;
    char config_path[256];
    char spool_dir[256];
} plc_config_t;

typedef struct
{
    pthread_mutex_t lock;
    uint16_t holding_registers[100]; // 40001 - 40100
    uint8_t coils[16];
    plant_state_t plant_state;
    plant_control_t plant_control;
    char spool_dir[256];
} plc_state_t;

static plc_state_t g_plc_state;
static volatile bool g_running = true;

// ----------------------------------------------------------------------------
// Honeytap Exploit Spooler: Emits structured telemetry for Phase 3 (.spkg)
// ----------------------------------------------------------------------------
static void ensure_spool_dir(const char *dir)
{
    struct stat st = {0};
    if (stat(dir, &st) == -1)
    {
        mkdir(dir, 0755);
    }
}

static void honeynet_spool_exploit(const char *protocol,
                                   const char *client_ip,
                                   int client_port,
                                   uint8_t func_or_type,
                                   const uint8_t *payload,
                                   size_t payload_len,
                                   double cbf_h,
                                   const char *reason)
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    uint64_t timestamp_ms = (uint64_t)tv.tv_sec * 1000 + (tv.tv_usec / 1000);

    const char *active_dir = g_plc_state.spool_dir;
    ensure_spool_dir(active_dir);

    char filepath[512];
    snprintf(filepath, sizeof(filepath), "%s/exploit_%lu_%s.json",
             active_dir, (unsigned long)timestamp_ms, protocol);

    FILE *f = fopen(filepath, "w");
    if (!f)
    {
        // Try fallback directory
        active_dir = FALLBACK_SPOOL_DIR;
        ensure_spool_dir(active_dir);
        snprintf(filepath, sizeof(filepath), "%s/exploit_%lu_%s.json",
                 active_dir, (unsigned long)timestamp_ms, protocol);
        f = fopen(filepath, "w");
    }

    if (!f)
    {
        fprintf(stderr, "[-] [Honeytap] Failed to write exploit spool file\n");
        return;
    }

    // Convert raw payload to hex string
    char hex_buf[2048] = {0};
    size_t hex_limit = (payload_len < 1024) ? payload_len : 1024;
    for (size_t i = 0; i < hex_limit; ++i)
    {
        sprintf(hex_buf + (i * 2), "%02X", payload[i]);
    }

    fprintf(f, "{\n");
    fprintf(f, "  \"timestamp\": %lu,\n", (unsigned long)timestamp_ms);
    fprintf(f, "  \"protocol\": \"%s\",\n", protocol);
    fprintf(f, "  \"client_ip\": \"%s\",\n", client_ip);
    fprintf(f, "  \"client_port\": %d,\n", client_port);
    fprintf(f, "  \"function_code\": %u,\n", func_or_type);
    fprintf(f, "  \"payload_len\": %zu,\n", payload_len);
    fprintf(f, "  \"payload_hex\": \"%s\",\n", hex_buf);
    fprintf(f, "  \"cbf_barrier_h\": %.4f,\n", cbf_h);
    fprintf(f, "  \"reason\": \"%s\"\n", reason);
    fprintf(f, "}\n");
    fclose(f);

    printf("[!] [Honeytap Auto-Capture] Spooled exploit from %s:%d (%s) -> %s\n",
           client_ip, client_port, protocol, filepath);
}

// ----------------------------------------------------------------------------
// Physics Simulation Loop (4th-Order Runge-Kutta RK4 ODE Integration)
// ----------------------------------------------------------------------------
void *physics_simulation_thread(void *arg)
{
    (void)arg;
    double dt = 0.1; // 100ms integration step

    while (g_running)
    {
        pthread_mutex_lock(&g_plc_state.lock);

        // Read control inputs u(t) driven by PLC coils/registers
        g_plc_state.plant_control.heater_power = g_plc_state.coils[0] ? 1.0 : 0.2;
        g_plc_state.plant_control.pump_speed = (double)g_plc_state.holding_registers[0] / 1000.0;
        g_plc_state.plant_control.valve_opening = g_plc_state.coils[1] ? 0.8 : 0.1;

        // Perform RK4 numerical integration step: dx/dt = f(x, u)
        plant_ode_step_rk4(&g_plc_state.plant_state, &g_plc_state.plant_control, dt);

        // Map physical states directly into Modbus Holding Registers
        g_plc_state.holding_registers[1] = (uint16_t)g_plc_state.plant_state.temperature;
        g_plc_state.holding_registers[2] = (uint16_t)g_plc_state.plant_state.vibration;
        g_plc_state.holding_registers[3] = (uint16_t)g_plc_state.plant_state.pressure;

        pthread_mutex_unlock(&g_plc_state.lock);
        usleep(100000); // 100ms loop
    }
    return NULL;
}

// ----------------------------------------------------------------------------
// Modbus TCP Server Listener Thread (Port 502) - Active Honeytap Mode
// ----------------------------------------------------------------------------
void *modbus_server_thread(void *arg)
{
    int port = *(int *)arg;
    int server_fd, client_fd;
    struct sockaddr_in address, client_addr;
    int opt = 1;

    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) < 0)
    {
        perror("[-] [Modbus] Socket creation failed");
        return NULL;
    }

    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port);

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0)
    {
        printf("[-] [Modbus] Bind failed on port %d: %s\n", port, strerror(errno));
        close(server_fd);
        return NULL;
    }

    listen(server_fd, 10);
    printf("[+] [Modbus TCP Honeytap] Active & Listening on port %d\n", port);

    while (g_running)
    {
        socklen_t addrlen = sizeof(client_addr);
        client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &addrlen);
        if (client_fd < 0)
            continue;

        char client_ip[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &client_addr.sin_addr, client_ip, sizeof(client_ip));
        int client_port = ntohs(client_addr.sin_port);

        // Maintain persistent connection loop for multi-step attack capture
        uint8_t buffer[512];
        ssize_t bytes_read;
        while ((bytes_read = recv(client_fd, buffer, sizeof(buffer), 0)) > 0)
        {
            if (bytes_read > 7)
            {
                uint8_t unit_id = buffer[6];
                uint8_t func_code = buffer[7];

                pthread_mutex_lock(&g_plc_state.lock);
                double cbf_h = plant_cbf_evaluate(&g_plc_state.plant_state, 120.0);

                if (func_code == 0x03)
                { // Read Holding Registers
                    uint8_t response[15] = {
                        buffer[0], buffer[1],
                        0x00, 0x00,
                        0x00, 0x09,
                        unit_id,
                        0x03,
                        0x06,
                        (uint8_t)(g_plc_state.holding_registers[0] >> 8),
                        (uint8_t)(g_plc_state.holding_registers[0] & 0xFF),
                        (uint8_t)(g_plc_state.holding_registers[1] >> 8),
                        (uint8_t)(g_plc_state.holding_registers[1] & 0xFF),
                        (uint8_t)(g_plc_state.holding_registers[2] >> 8),
                        (uint8_t)(g_plc_state.holding_registers[2] & 0xFF)};
                    send(client_fd, response, sizeof(response), 0);
                }
                else if (func_code == 0x05 || func_code == 0x06 || func_code == 0x0F || func_code == 0x10)
                {
                    // Write commands: Potential exploit vector
                    if (func_code == 0x05 && bytes_read >= 12)
                    {
                        uint16_t coil_addr = (buffer[8] << 8) | buffer[9];
                        if (coil_addr < 16)
                        {
                            g_plc_state.coils[coil_addr] = (buffer[10] == 0xFF);
                        }
                    }
                    else if (func_code == 0x06 && bytes_read >= 12)
                    {
                        uint16_t reg_addr = (buffer[8] << 8) | buffer[9];
                        uint16_t reg_val = (buffer[10] << 8) | buffer[11];
                        if (reg_addr < 100)
                        {
                            g_plc_state.holding_registers[reg_addr] = reg_val;
                        }
                    }

                    // Honeytap Exploit Trigger: Capture write payloads altering physical state
                    honeynet_spool_exploit("MODBUS", client_ip, client_port, func_code,
                                           buffer, (size_t)bytes_read, cbf_h,
                                           "UNAUTHORIZED_WRITE_MODBUS");

                    // Echo back standard write acknowledgment
                    send(client_fd, buffer, bytes_read, 0);
                }
                else
                {
                    // Unknown or proprietary/diagnostic function code
                    honeynet_spool_exploit("MODBUS", client_ip, client_port, func_code,
                                           buffer, (size_t)bytes_read, cbf_h,
                                           "ANOMALOUS_FUNCTION_CODE");
                }

                pthread_mutex_unlock(&g_plc_state.lock);
            }
        }
        close(client_fd);
    }

    close(server_fd);
    return NULL;
}

// ----------------------------------------------------------------------------
// Siemens S7Comm Server Listener Thread (Port 102) - Active Honeytap Mode
// ----------------------------------------------------------------------------
void *s7comm_server_thread(void *arg)
{
    int port = *(int *)arg;
    int server_fd, client_fd;
    struct sockaddr_in address, client_addr;
    int opt = 1;

    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) < 0)
        return NULL;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port);

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0)
    {
        close(server_fd);
        return NULL;
    }

    listen(server_fd, 10);
    printf("[+] [S7Comm Honeytap] Active & Listening on port %d\n", port);

    while (g_running)
    {
        socklen_t addrlen = sizeof(client_addr);
        client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &addrlen);
        if (client_fd < 0)
            continue;

        char client_ip[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &client_addr.sin_addr, client_ip, sizeof(client_ip));
        int client_port = ntohs(client_addr.sin_port);

        uint8_t buffer[512];
        ssize_t bytes_read;
        while ((bytes_read = recv(client_fd, buffer, sizeof(buffer), 0)) > 0)
        {
            // S7 COTP Connection Request (CR: 0xE0)
            if (bytes_read > 4 && buffer[0] == 0x03)
            {
                if (buffer[5] == 0xE0)
                {
                    uint8_t cotp_cc[] = {0x03, 0x00, 0x00, 0x0B, 0x06, 0xD0, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00};
                    send(client_fd, cotp_cc, sizeof(cotp_cc), 0);
                }
                // S7 Comm Header (Protocol ID: 0x32)
                else if (bytes_read >= 17 && buffer[7] == 0x32)
                {
                    uint8_t rosctr = buffer[8];
                    uint8_t func = buffer[17];

                    // Check for CPU STOP (0x29) or Control functions (0x28)
                    if (func == 0x29 || func == 0x28)
                    {
                        honeynet_spool_exploit("S7COMM", client_ip, client_port, func,
                                               buffer, (size_t)bytes_read, 1.0,
                                               "S7_PLC_STOP_COMMAND");
                    }
                    else
                    {
                        honeynet_spool_exploit("S7COMM", client_ip, client_port, rosctr,
                                               buffer, (size_t)bytes_read, 1.0,
                                               "S7_COMMUNICATION_PROBE");
                    }
                }
            }
        }
        close(client_fd);
    }

    close(server_fd);
    return NULL;
}

// ----------------------------------------------------------------------------
// IEC 60870-5-104 Server Listener Thread (Port 2404) - Active Honeytap Mode
// ----------------------------------------------------------------------------
void *iec104_server_thread(void *arg)
{
    int port = *(int *)arg;
    int server_fd, client_fd;
    struct sockaddr_in address, client_addr;
    int opt = 1;

    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) < 0)
        return NULL;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port);

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0)
    {
        close(server_fd);
        return NULL;
    }

    listen(server_fd, 10);
    printf("[+] [IEC-104 Grid Honeytap] Active & Listening on port %d\n", port);

    while (g_running)
    {
        socklen_t addrlen = sizeof(client_addr);
        client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &addrlen);
        if (client_fd < 0)
            continue;

        char client_ip[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &client_addr.sin_addr, client_ip, sizeof(client_ip));
        int client_port = ntohs(client_addr.sin_port);

        uint8_t buffer[512];
        ssize_t bytes_read;
        while ((bytes_read = recv(client_fd, buffer, sizeof(buffer), 0)) > 0)
        {
            if (bytes_read >= 6 && buffer[0] == 0x68)
            {
                // TESTFR or STARTDT U-format frames
                uint8_t control_field = buffer[2];
                if ((control_field & 0x03) == 0x03)
                {
                    uint8_t iec_ack[] = {0x68, 0x04, 0x0B, 0x00, 0x00, 0x00};
                    send(client_fd, iec_ack, sizeof(iec_ack), 0);
                }
                else
                {
                    // APCI/ASDU command frame (e.g. Interrogation or Tele-control command)
                    honeynet_spool_exploit("IEC104", client_ip, client_port, control_field,
                                           buffer, (size_t)bytes_read, 1.0,
                                           "IEC104_COMMAND_FRAME");
                }
            }
        }
        close(client_fd);
    }

    close(server_fd);
    return NULL;
}

int main(int argc, char *argv[])
{
    plc_config_t config;
    config.modbus_port = DEFAULT_MODBUS_PORT;
    config.s7comm_port = DEFAULT_S7COMM_PORT;
    config.iec104_port = DEFAULT_IEC104_PORT;
    strncpy(config.config_path, "configs/plc_register_map.json", sizeof(config.config_path));
    strncpy(config.spool_dir, DEFAULT_SPOOL_DIR, sizeof(config.spool_dir));

    int opt;
    while ((opt = getopt(argc, argv, "p:s:i:c:d:h")) != -1)
    {
        switch (opt)
        {
        case 'p':
            config.modbus_port = atoi(optarg);
            break;
        case 's':
            config.s7comm_port = atoi(optarg);
            break;
        case 'i':
            config.iec104_port = atoi(optarg);
            break;
        case 'c':
            strncpy(config.config_path, optarg, sizeof(config.config_path));
            break;
        case 'd':
            strncpy(config.spool_dir, optarg, sizeof(config.spool_dir));
            break;
        case 'h':
        default:
            printf("Usage: %s [-p modbus_port] [-s s7_port] [-i iec_port] [-c config.json] [-d spool_dir]\n", argv[0]);
            return 0;
        }
    }

    pthread_mutex_init(&g_plc_state.lock, NULL);
    strncpy(g_plc_state.spool_dir, config.spool_dir, sizeof(g_plc_state.spool_dir));
    g_plc_state.holding_registers[0] = 500;
    g_plc_state.plant_state.temperature = 85.0;
    g_plc_state.plant_state.vibration = 1200.0;
    g_plc_state.plant_state.pressure = 100.0;

    printf("===============================================================\n");
    printf("  ARYORITHM SENTINEL-MATRIX: HONEYTAP ACTIVE DECOY PLC TWIN\n");
    printf("===============================================================\n");
    printf("[+] Configuration Path : %s\n", config.config_path);
    printf("[+] Spool Directory    : %s\n", g_plc_state.spool_dir);
    printf("[+] Modbus TCP Port    : %d\n", config.modbus_port);
    printf("[+] Siemens S7 Port    : %d\n", config.s7comm_port);
    printf("[+] IEC 60870-5-104    : %d\n", config.iec104_port);
    printf("===============================================================\n");

    pthread_t th_physics, th_modbus, th_s7, th_iec;
    pthread_create(&th_physics, NULL, physics_simulation_thread, NULL);
    pthread_create(&th_modbus, NULL, modbus_server_thread, &config.modbus_port);
    pthread_create(&th_s7, NULL, s7comm_server_thread, &config.s7comm_port);
    pthread_create(&th_iec, NULL, iec104_server_thread, &config.iec104_port);

    pthread_join(th_physics, NULL);
    pthread_join(th_modbus, NULL);
    pthread_join(th_s7, NULL);
    pthread_join(th_iec, NULL);

    pthread_mutex_destroy(&g_plc_state.lock);
    return 0;
}