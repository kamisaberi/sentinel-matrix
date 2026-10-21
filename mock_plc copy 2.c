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

#if __has_include("plant_ode.h")
#include "plant_ode.h"
#elif __has_include("include/plant_ode.h")
#include "include/plant_ode.h"
#endif
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
    plant_state_t plant_state;
    plant_control_t plant_control;
} plc_state_t;

static plc_state_t g_plc_state;
static volatile bool g_running = true;

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
            uint8_t unit_id = buffer[6];
            uint8_t func_code = buffer[7];

            pthread_mutex_lock(&g_plc_state.lock);

            if (func_code == 0x03)
            { // Read Holding Registers
                uint8_t response[15] = {
                    buffer[0], buffer[1],
                    0x00, 0x00,
                    0x00, 0x09,
                    unit_id,
                    0x03,
                    0x06, // 6 bytes
                    (uint8_t)(g_plc_state.holding_registers[0] >> 8),
                    (uint8_t)(g_plc_state.holding_registers[0] & 0xFF),
                    (uint8_t)(g_plc_state.holding_registers[1] >> 8),
                    (uint8_t)(g_plc_state.holding_registers[1] & 0xFF),
                    (uint8_t)(g_plc_state.holding_registers[2] >> 8),
                    (uint8_t)(g_plc_state.holding_registers[2] & 0xFF)};
                send(client_fd, response, sizeof(response), 0);
            }
            else if (func_code == 0x05 || func_code == 0x06)
            {
                if (func_code == 0x05)
                {
                    uint16_t coil_addr = (buffer[8] << 8) | buffer[9];
                    if (coil_addr < 16)
                    {
                        g_plc_state.coils[coil_addr] = (buffer[10] == 0xFF);
                    }
                }
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
        {
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
        {
            uint8_t iec_ack[] = {0x68, 0x04, 0x0B, 0x00, 0x00, 0x00};
            send(client_fd, iec_ack, sizeof(iec_ack), 0);
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

    pthread_mutex_init(&g_plc_state.lock, NULL);
    g_plc_state.holding_registers[0] = 500;
    g_plc_state.plant_state.temperature = 85.0;
    g_plc_state.plant_state.vibration = 1200.0;
    g_plc_state.plant_state.pressure = 100.0;

    printf("===============================================================\n");
    printf("  ARYORITHM SENTINEL-MATRIX: RK4 ODE PHYSICAL PLANT PLC TWIN\n");
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