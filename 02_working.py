import numpy as np

N = 200
x = np.arange(N)
print(x)

N_directions = 3

c_x = np.array([0, 1, -1])
print(c_x)

w = np.array([2/3, 1/6, 1/6])
print(w)

F = np.ones((N, N_directions)) * w
print(F)

rho_init = 1 + 0.4 * np.exp(-((x - N / 2) ** 2) / 10)

F *= rho_init[:, None]

print(F[0:4])
print(F[95:99])
print(F[196:200])

import matplotlib.pyplot as plt

plot = plt.figure(figsize=(8, 4)) #opens a figure that is 8 inches wide by 4 inches tall

N_timesteps = 500

for i in range(N_timesteps):
    F_streamed = np.zeros_like(F) # Create a new array to hold the streamed values after they move - same size and shape as F but filled with zeros

    F_streamed[:, 0] = F[:, 0]
    F_streamed[1:, 1] = F[:-1, 1]
    F_streamed[:-1, 2] = F[1:, 2] # The particles in direction 2 move to the left

    #BOUNCEBACK
    F_streamed[-1, 2] += F[-1, 1] # The particles that were in direction 1 and at the right edge move to direction 2
    F_streamed[0, 1] += F[0, 2] # The particles that were in direction 2 and at the left edge move to direction 1   

    F = F_streamed # Update F to be the streamed version for the next iteration

    rho = np.sum(F, axis=1) # Calculate the density by summing over the directions for each position
    u = np.sum(F * c_x, axis=1) / rho # Calculate the velocity by taking the weighted sum of the directions and dividing by density

    if i % 5 == 0:
        plt.cla() # Clear the current axes
        plt.plot(x, rho, label="density rho") # Plot the density
        plt.axvline(0, linestyle="--", alpha=0.5) # Left wall
        plt.axvline(N - 1, linestyle="--", alpha=0.5) # Right wall
        plt.ylim(0.8, 1.5) # Set y-axis limits
        plt.xlabel("position x") # Label for x-axis
        plt.ylabel("density") # Label for y-axis
        plt.title(f"1D Lattice Boltzmann with wall bounce-back, timestep {i}")
        plt.pause(0.01)

plt.show()