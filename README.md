# ComfyUI-Dynamic-Sigmas

A ComfyUI custom node for visual and dynamic sigma scheduling. This node allows both beginners and advanced users to easily tune, visualize, and concatenate custom sigma curves for precise diffusion control.

---

<img width="903" height="955" alt="1" src="https://github.com/user-attachments/assets/f748af61-667d-4147-a3d7-f870e5d9ccf5" />

## Features

### 1. Dynamic Sigma Scheduler (Main Node)
The core node for generating and customizing sigma schedules with an interactive graph.

* **steps**: Number of noise steps.
* **sigma_start**: Starting sigma value. (e.g., SDXL: 15.0, WAN/LTX: 1.0. Default is 1.0).
* **sigma_end**: Ending sigma value. Can be set to 0, or a specific value to chain with the Concat node.
* **curve_factor**: Adjust the curve slope easily using a slider without manually editing the graph.
* **curve_smooth**: Applies smooth interpolation between points. When disabled, points are connected with straight, flat lines.
* **show_steps**: Displays exact numerical values for precise manual input (supports 15+ decimal places).
* **black_theme**: Toggles the graph UI between dark (default) and light modes.
* **Generate Curve**: Manually applies the configured values to the graph (values also update in real-time).
* **Reset Graph**: Resets the graph to a straight line and clears all custom points.
* **Interactive Graph Controls**: 
  * **Left Click**: Add a custom point.
  * **Shift + Left Click**: Remove a point.

---

### 2. Graph Sigmas
A utility node for detailed visualization and value checking.

<img width="1097" height="1138" alt="2" src="https://github.com/user-attachments/assets/95ed347d-55b8-4e97-a8de-d62febd96760" />

* **input_count**: Dynamically increase the number of inputs and outputs to view multiple schedules.
* **black_theme**: Toggles between dark and light modes.

---

### 3. Concat Sigmas
Concatenates multiple sigma schedules into a single continuous sequence.

<img width="2067" height="1306" alt="image" src="https://github.com/user-attachments/assets/5b981dff-2300-4402-8a55-f991a56f80be" />

* **input_count**: Adjust the number of inputs to connect 2 or more schedules.
* **Usage Example**: Connect Scheduler 1 (start 1.0, end 0.5) and Scheduler 2 (start 0.5, end 0.0) to create a seamless combined schedule. You can chain multiple nodes (e.g., 15 to 11, 11 to 7, 7 to 0).

---

## Installation

### Method 1: ComfyUI Manager (Recommended)
1. Open ComfyUI Manager.
2. Click "Custom Nodes Manager".
3. Search for `ComfyUI-Dynamic-Sigmas` and click Install.
4. Restart ComfyUI.

### Method 2: Manual Git Clone
Navigate to your ComfyUI `custom_nodes` directory and clone the repository:

```bash
# Navigate to your ComfyUI custom_nodes folder
cd ComfyUI/custom_nodes

# Clone the repository
git clone https://github.com/crom8505/ComfyUI-Dynamic-Sigmas.git
```

Restart ComfyUI.

---

## License

MIT License
