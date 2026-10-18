#ifndef PLANT_ODE_H
#define PLANT_ODE_H

#include <stdbool.h>

#ifdef __cplusplus
extern "C"
{
#endif

    typedef struct
    {
        double temperature; // Thermal state (deg C)
        double vibration;   // RPM / Mechanical vibration
        double pressure;    // Hydraulic pressure (PSI)
    } plant_state_t;

    typedef struct
    {
        double heater_power;  // Control u1: 0.0 to 1.0
        double pump_speed;    // Control u2: 0.0 to 1.0
        double valve_opening; // Control u3: 0.0 to 1.0
    } plant_control_t;

    // 4th-Order Runge-Kutta Numerical ODE Integration Step: dx/dt = f(x, u)
    void plant_ode_step_rk4(plant_state_t *state, const plant_control_t *control, double dt);

    // Evaluates whether physical state x(t) is inside safe region S_safe
    bool plant_state_is_safe(const plant_state_t *state, double max_temp_c, double max_vibration, double max_pressure);

    // --- CONTROL BARRIER FUNCTION (CBF) FORMAL VERIFICATION EXTENSIONS ---
    // Evaluates Barrier Function h(x) = max_temp_c - temperature. Safe set C: h(x) >= 0
    double plant_cbf_evaluate(const plant_state_t *state, double max_temp_c);

    // Evaluates dh(x)/dt = -dT/dt along system dynamics f(x, u)
    double plant_cbf_dot_evaluate(const plant_state_t *state, const plant_control_t *control);

    // Checks Nagumo's Forward-Invariance Inequality: dh(x)/dt + alpha * h(x) >= 0
    bool plant_cbf_check_invariance(const plant_state_t *state, const plant_control_t *control, double max_temp_c, double alpha);

#ifdef __cplusplus
}
#endif

#endif // PLANT_ODE_H