import numpy as np
import matplotlib.pyplot as plt

# -----------------------------
# 1D Lattice Boltzmann: D1Q3
# closed tube with wall bounce-back
# -----------------------------

Nx = 200
Nt = 500

rho0 = 1.0
tau = 2

# Three velocity directions:
# 0 = rest, 1 = right, 2 = left
NL = 3
cx = np.array([0, 1, -1])
w = np.array([2 / 3, 1 / 6, 1 / 6])

# F[x, i] = amount of fluid at position x moving in direction i
F = np.ones((Nx, NL)) * rho0 * w

# Initial density bump in the middle
x = np.arange(Nx)
rho_bump = 1 + 0.4 * np.exp(-((x - Nx / 2) ** 2) / 200)

for i in range(NL):
    F[:, i] *= rho_bump

plt.figure(figsize=(8, 4))

for it in range(Nt):

    # -----------------------------
    # 1. STREAM / DRIFT
    # -----------------------------
    F_streamed = np.zeros_like(F)

    # Rest particles stay where they are
    F_streamed[:, 0] = F[:, 0]

    # Right-moving particles move one cell right
    F_streamed[1:, 1] = F[:-1, 1]

    # Left-moving particles move one cell left
    F_streamed[:-1, 2] = F[1:, 2]

    # -----------------------------
    # 2. WALL BOUNCE-BACK
    # -----------------------------
    # Particle trying to leave the right wall reflects left
    F_streamed[-1, 2] += F[-1, 1]

    # Particle trying to leave the left wall reflects right
    F_streamed[0, 1] += F[0, 2]

    F = F_streamed

    # -----------------------------
    # 3. COMPUTE FLUID VARIABLES
    # -----------------------------
    rho = np.sum(F, axis=1)
    u = np.sum(F * cx, axis=1) / rho

    # -----------------------------
    # 4. EQUILIBRIUM DISTRIBUTION
    # -----------------------------
    Feq = np.zeros_like(F)

    for i in range(NL):
        cu = cx[i] * u
        Feq[:, i] = rho * w[i] * (
            1
            + 3 * cu
            + 4.5 * cu**2
            - 1.5 * u**2
        )

    # -----------------------------
    # 5. COLLISION / RELAXATION
    # -----------------------------
    F += -(1 / tau) * (F - Feq)

    # -----------------------------
    # 6. PLOT DENSITY
    # -----------------------------
    if it % 5 == 0:
        plt.cla()
        plt.plot(x, rho, label="density rho")
        plt.axvline(0, linestyle="--", alpha=0.5)
        plt.axvline(Nx - 1, linestyle="--", alpha=0.5)
        plt.ylim(0.8, 1.5)
        plt.xlabel("position x")
        plt.ylabel("density")
        plt.title(f"1D Lattice Boltzmann with wall bounce-back, timestep {it}")
        plt.legend()
        plt.pause(0.01)

plt.show()