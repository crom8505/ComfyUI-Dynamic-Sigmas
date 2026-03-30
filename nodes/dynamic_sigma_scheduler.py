import torch
import json

class DynamicSigmaScheduler:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "steps": ("INT", {"default": 4, "min": 1, "max": 100}),
                "sigma_start": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 100.0, "step": 0.01}),
                "sigma_end": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 100.0, "step": 0.01}),
                "curve_factor": ("FLOAT", {"default": 0.0, "min": -100.0, "max": 100.0, "step": 0.01}),
                "curve_smooth": ("BOOLEAN", {"default": False}),
                "show_steps": ("BOOLEAN", {"default": False}),
                "black_theme": ("BOOLEAN", {"default": True}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("SIGMAS",)
    FUNCTION = "get_sigmas"
    CATEGORY = "sampling/custom_math"

    def get_sigmas(self, steps, sigma_start, sigma_end, curve_factor, curve_smooth, show_steps, black_theme, prompt=None, unique_id=None, **kwargs):
        sigmas = []
        
        node_data = prompt[unique_id] if prompt and unique_id in prompt else {}
        inputs = node_data.get("inputs", {})
        
        if steps == 0:
            sigmas =[float(sigma_start), float(sigma_end)]
            return (torch.tensor(sigmas, dtype=torch.float32),)

        is_step_external = any(f"step_{i}" in kwargs for i in range(1, steps))
        is_shape_external = any(isinstance(inputs.get(k), list) for k in ["steps", "curve_factor", "curve_smooth"])
        
        step_data_str = inputs.get("step_data", "")
        if step_data_str and not is_shape_external and not is_step_external:
            try:
                parsed_steps = json.loads(step_data_str)
                if len(parsed_steps) == steps + 1:
                    sigmas = [float(sigma_start)]
                    old_start = float(parsed_steps[0])
                    old_end = float(parsed_steps[-1])
                    
                    for i in range(1, steps):
                        val = float(parsed_steps[i])
                        if abs(sigma_start - old_start) > 1e-5 or abs(sigma_end - old_end) > 1e-5:
                            if abs(old_start - old_end) > 1e-5:
                                normalized = (val - old_end) / (old_start - old_end)
                                val = sigma_end + normalized * (sigma_start - sigma_end)
                            else:
                                val = sigma_start
                        sigmas.append(val)
                        
                    sigmas.append(float(sigma_end))
                    return (torch.tensor(sigmas, dtype=torch.float32),)
            except Exception:
                pass
        
        is_any_external = any(isinstance(inputs.get(k), list) for k in["steps", "sigma_start", "sigma_end", "curve_factor", "curve_smooth"])
        
        sigmas.append(float(sigma_start))
        for i in range(1, steps):
            step_key = f"step_{i}"
            if step_key in kwargs:
                sigmas.append(float(kwargs[step_key]))
            else:
                val = inputs.get(step_key, None)
                if val is not None and not is_any_external and not isinstance(val, list):
                    sigmas.append(float(val))
                else:
                    t = i / steps
                    if curve_factor > 0:
                        t_prime = t ** (1.0 + curve_factor)
                    elif curve_factor < 0:
                        t_prime = 1.0 - (1.0 - t) ** (1.0 - curve_factor)
                    else:
                        t_prime = t
                        
                    fallback_val = sigma_start - t_prime * (sigma_start - sigma_end)
                    sigmas.append(float(fallback_val))
        
        sigmas.append(float(sigma_end))
        return (torch.tensor(sigmas, dtype=torch.float32),)