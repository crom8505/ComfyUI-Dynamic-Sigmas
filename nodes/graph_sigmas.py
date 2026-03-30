import torch
import io
import numpy as np
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from PIL import Image
from .utils import DynamicInputDict, DynamicReturnType, DynamicReturnNames

class GraphSigmas:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "input_count": ("INT", {"default": 1, "min": 1, "max": 100}),
                "black_theme": ("BOOLEAN", {"default": True}),
            },
            "optional": DynamicInputDict({"sigma_1": ("SIGMAS",)})
        }

    RETURN_TYPES = DynamicReturnType(("IMAGE",), default_type="IMAGE", max_len=100)
    RETURN_NAMES = DynamicReturnNames(("IMAGE_1",), prefix="IMAGE_", max_len=100)
    FUNCTION = "plot_graph"
    CATEGORY = "sampling/custom_math"

    def plot_graph(self, input_count, black_theme, **kwargs):
        images =[]
        for i in range(1, input_count + 1):
            key = f"sigma_{i}"
            if key in kwargs:
                sig = kwargs[key].numpy()
                x = np.arange(len(sig))
                
                if black_theme:
                    bg_color = '#1e1e1e'
                    text_color = '#d4d4d4'
                    line_color = '#00d2d3' 
                    fill_color = '#00d2d3'
                    grid_color = '#ffffff'
                else:
                    bg_color = '#ffffff'
                    text_color = '#333333'
                    line_color = '#2e86de' 
                    fill_color = '#2e86de'
                    grid_color = '#000000'

                fig = Figure(figsize=(6, 4))
                canvas = FigureCanvas(fig)
                fig.patch.set_facecolor(bg_color)
                
                ax = fig.add_subplot(111)
                ax.set_facecolor(bg_color)
                
                for spine in ax.spines.values():
                    spine.set_color(text_color)
                    spine.set_alpha(0.3)
                    
                ax.tick_params(colors=text_color)
                ax.xaxis.label.set_color(text_color)
                ax.yaxis.label.set_color(text_color)

                ax.plot(x, sig, marker='o', markersize=5, color=line_color, linewidth=2, zorder=3)
                ax.fill_between(x, sig, 0, color=fill_color, alpha=0.15, zorder=2)

                ax.set_xlabel("Step")
                ax.set_ylabel("Sigma")
                ax.grid(True, color=grid_color, linestyle='--', alpha=0.15, zorder=1)
                
                fig.tight_layout()
                
                buf = io.BytesIO()
                canvas.print_png(buf)
                buf.seek(0)
                
                img = Image.open(buf).convert('RGB')
                img_tensor = torch.from_numpy(np.array(img).astype(np.float32) / 255.0).unsqueeze(0)
                images.append(img_tensor)
                
                buf.close()
                fig.clear()
            else:
                blank = torch.zeros((1, 64, 64, 3), dtype=torch.float32)
                images.append(blank)
        
        return tuple(images)