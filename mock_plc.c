#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <pthread.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <signal.h>
#include <stdbool.h>

#define DEFAULT_MODBUS_PORT 502
#define DEFAULT_S7COMM_PORT 102
#define DEFAULT_IEC104_PORT 2404

typedef struct
{
    int modbus_port;
    int s7comm_port;
    int iec104_port;
    char config_path[256];
} plc_config_t;

typedef struct
{
    pthread_mutex_t lock;
    uint16_t holding_registers[100]; // 40001 - 40100
    uint8_t coils[16];
    float temperature_celsius;
    float vibration_rpm;
    float pressure_psi;
} plc_state_t;

static plc_state_t g_plc_state;
static volatile bool g_running = true;

// ----------------------------------------------------------------------------
// Physics Simulation Loop (Updates registers dynamically in real-time)
// ----------------------------------------------------------------------------
void *physics_simulation_thread(void *arg)
{
    (void)arg;
    while (g_running)
    {
        pthread_mutex_lock(&g_plc_state.lock);

        // Auto-increment thermal sensor state slightly to simulate dynamic physical operation
        g_plc_state.temperature_celsius += 0.1f;
        if (g_plc_state.temperature_celsius > 125.0f)
        {
            g_plc_state.temperature_celsius = 85.0f; // Reset loop
        }

        // Map thermal float state directly into Modbus Holding Register 40002
        g_plc_state.holding_registers[1] = (uint16_t)g_plc_state.temperature_celsius;

        pthread_mutex_unlock(&g_plc_state.lock);
        sleep(1);
    }
    return NULL;
}

// ----------------------------------------------------------------------------
// Modbus TCP Server Listener Thread (Port 502)
// ----------------------------------------------------------------------------
void *modbus_server_thread(void *arg)
{
    int port = *(int *)arg;
    int server_fd, client_fd;
    struct sockaddr_in address;
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

    listen(server_fd, 5);
    printf("[+] [Modbus TCP Twin] Active & Listening on port %d\n", port);

    while (g_running)
    {
        socklen_t addrlen = sizeof(address);
        client_fd = accept(server_fd, (struct sockaddr *)&address, &addrlen);
        if (client_fd < 0)
            continue;

        uint8_t buffer[256];
        ssize_t bytes_read = recv(client_fd, buffer, sizeof(buffer), 0);
        if (bytes_read > 7)
        {
            // Modbus MBAP Header Response Generation
            uint8_t unit_id = buffer[6];
            uint8_t func_code = buffer[7];

            pthread_mutex_lock(&g_plc_state.lock);

            if (func_code == 0x03)
            { // Read Holding Registers
                uint8_t response[13] = {
                    buffer[0], buffer[1], // Transaction ID
                    0x00, 0x00,           // Protocol ID
                    0x00, 0x07,           // Length
                    unit_id,
                    0x03, // Function Code
                    0x04, // Byte count
                    (uint8_t)(g_plc_state.holding_registers[0] >> 8),
                    (uint8_t)(g_plc_state.holding_registers[0] & 0xFF),
                    (uint8_t)(g_plc_state.holding_registers[1] >> 8),
                    (uint8_t)(g_plc_state.holding_registers[1] & 0xFF)};
                send(client_fd, response, sizeof(response), 0);
            }
            else if (func_code == 0x05 || func_code == 0x06)
            { // Write Single Coil/Register
                // Echo back query as Modbus ACK
                send(client_fd, buffer, bytes_read, 0);
            }

            pthread_mutex_unlock(&g_plc_state.lock);
        }
        close(client_fd);
    }

    close(server_fd);
    return NULL;
}

// ----------------------------------------------------------------------------
// Siemens S7Comm Server Listener Thread (Port 102)
// ----------------------------------------------------------------------------
void *s7comm_server_thread(void *arg)
{
    int port = *(int *)arg;
    int server_fd, client_fd;
    struct sockaddr_in address;
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

    listen(server_fd, 5);
    printf("[+] [S7Comm Twin] Active & Listening on port %d\n", port);

    while (g_running)
    {
        socklen_t addrlen = sizeof(address);
        client_fd = accept(server_fd, (struct sockaddr *)&address, &addrlen);
        if (client_fd < 0)
            continue;

        uint8_t buffer[256];
        ssize_t bytes_read = recv(client_fd, buffer, sizeof(buffer), 0);
        if (bytes_read > 4 && buffer[0] == 0x03)
        { // COTP CR Connection Request
            // Standard COTP Connection Confirm (CC) packet response
            uint8_t cotp_cc[] = {0x03, 0x00, 0x00, 0x0B, 0x06, 0xD0, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00};
            send(client_fd, cotp_cc, sizeof(cotp_cc), 0);
        }
        close(client_fd);
    }

    close(server_fd);
    return NULL;
}

// ----------------------------------------------------------------------------
// IEC 60870-5-104 Server Listener Thread (Port 2404)
// ----------------------------------------------------------------------------
void *iec104_server_thread(void *arg)
{
    int port = *(int *)arg;
    int server_fd, client_fd;
    struct sockaddr_in address;
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

    listen(server_fd, 5);
    printf("[+] [IEC-104 Grid Twin] Active & Listening on port %d\n", port);

    while (g_running)
    {
        socklen_t addrlen = sizeof(address);
        client_fd = accept(server_fd, (struct sockaddr *)&address, &addrlen);
        if (client_fd < 0)
            continue;

        uint8_t buffer[256];
        ssize_t bytes_read = recv(client_fd, buffer, sizeof(buffer), 0);
        if (bytes_read >= 6 && buffer[0] == 0x68)
        { // APCI Start Byte
            // Standard IEC-104 STARTDT CON (Start Data Transfer Confirm)
            uint8_t iec_ack[] = {0x68, 0x04, 0x0B, 0x00, 0x00, 0x00};
            send(client_fd, iec_ack, sizeof(iec_ack), 0);
        }
        close(client_fd);
    }

    close(server_fd);
    return NULL;
}

// ----------------------------------------------------------------------------
// Main CLI Parser & Entry Point
// ----------------------------------------------------------------------------
int main(int argc, char *argv[])
{
    plc_config_t config;
    config.modbus_port = DEFAULT_MODBUS_PORT;
    config.s7comm_port = DEFAULT_S7COMM_PORT;
    config.iec104_port = DEFAULT_IEC104_PORT;
    strncpy(config.config_path, "configs/plc_register_map.json", sizeof(config.config_path));

    // Parse CLI Flags
    int opt;
    while ((opt = getopt(argc, argv, "p:s:i:c:h")) != -1)
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
        case 'h':
        default:
            printf("Usage: %s [-p modbus_port] [-s s7_port] [-i iec_port] [-c config.json]\n", argv[0]);
            return 0;
        }
    }

    // Initialize state
    pthread_mutex_init(&g_plc_state.lock, NULL);
    g_plc_state.holding_registers[0] = 500; // Default Setpoint
    g_plc_state.holding_registers[1] = 85;  // Default Thermal Value (85 deg C)
    g_plc_state.temperature_celsius = 85.0f;

    printf("===============================================================\n");
    printf("        ARYORITHM SENTINEL-MATRIX: DYNAMIC MOCK PLC TWIN\n");
    printf("===============================================================\n");
    printf("[+] Configuration Path : %s\n", config.config_path);
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