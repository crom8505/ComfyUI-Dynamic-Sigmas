import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "Comfy.DynamicSigmaScheduler",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "DynamicSigmaScheduler") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;

                node.customPoints =[]; 

                node.getStepData = function() {
                    let w = node.widgets.find(w => w.name === "step_data");
                    if (w && w.value) {
                        try { return JSON.parse(w.value); } catch(e) {}
                    }
                    return[];
                };

                node.setStepData = function(arr) {
                    let w = node.widgets.find(w => w.name === "step_data");
                    if (!w) {
                        w = node.addWidget("text", "step_data", "[]", () => {});
                        w.type = "hidden"; 
                        w.hidden = true;
                        w.computeSize = () => [0, 0];
                    }
                    w.value = JSON.stringify(arr);
                };

                node.setStepData([]);

                node.computeSize = function(out) {
                    let expectedHeight = 0; 
                    for (let i = 0; i < this.widgets.length; i++) {
                        if (this.widgets[i].type !== "hidden") {
                            expectedHeight += LiteGraph.NODE_WIDGET_HEIGHT + 4;
                        }
                    }
                    expectedHeight += 30; 
                    let minHeight = expectedHeight + 130; 
                    
                    let minWidth = 250; 

                    if (out) {
                        out[0] = minWidth;
                        out[1] = minHeight;
                        return out;
                    }
                    return [minWidth, minHeight];
                };

                node.preserveGraphHeight = function(action) {
                    let prevMin = this.computeSize()[1];
                    let extraSpace = (this.size ? this.size[1] : prevMin) - prevMin;
                    extraSpace = Math.max(0, extraSpace);

                    action();

                    let currMin = this.computeSize()[1];
                    if (this.size) {
                        this.size[1] = currMin + extraSpace;
                    }
                    this.setDirtyCanvas(true, true);
                };

                node.getGraphInfo = function() {
                    const stepsWidget = this.widgets.find(w => w.name === "steps");
                    const sigmaStartWidget = this.widgets.find(w => w.name === "sigma_start");
                    const sigmaEndWidget = this.widgets.find(w => w.name === "sigma_end");
                    if (!stepsWidget || !sigmaStartWidget || !sigmaEndWidget) return null;

                    const steps = stepsWidget.value;
                    const sigma_start = sigmaStartWidget.value;
                    const sigma_end = sigmaEndWidget.value;
                    const data = this.getStepData();

                    let points =[];
                    points.push(sigma_start);
                    for (let i = 1; i < steps; i++) {
                        points.push(data[i] !== undefined ? data[i] : sigma_end);
                    }
                    if (steps > 0) points.push(sigma_end);

                    let expectedHeight = 0; 
                    for (let i = 0; i < this.widgets.length; i++) {
                        if (this.widgets[i].type !== "hidden") {
                            expectedHeight += LiteGraph.NODE_WIDGET_HEIGHT + 4;
                        }
                    }
                    expectedHeight += 30;

                    const graphSpace = Math.max(120, this.size[1] - expectedHeight - 10);
                    const y = expectedHeight;
                    const width = this.size[0];

                    let max_val = Math.max(sigma_start, sigma_end);
                    let min_val = Math.min(sigma_start, sigma_end);
                    if (max_val === min_val) max_val += 1.0;

                    const padding = 15;
                    const drawX = 10 + padding;
                    const drawY = y + padding;
                    const drawW = width - 20 - padding * 2;
                    const drawH = graphSpace - padding * 2;

                    const getX = (t) => drawX + t * drawW;
                    const getY = (val) => drawY + drawH - ((val - min_val) / (max_val - min_val)) * drawH;
                    const getT = (xPos) => (xPos - drawX) / drawW;
                    const getVal = (yPos) => min_val + ((drawY + drawH - yPos) / drawH) * (max_val - min_val);

                    return { points, getX, getY, getT, getVal, min_val, max_val, drawX, drawY, drawW, drawH, y, graphSpace, width };
                };

                const origOnDrawForeground = node.onDrawForeground;
                node.onDrawForeground = function(ctx) {
                    if (origOnDrawForeground) origOnDrawForeground.apply(this, arguments);

                    const graphInfo = this.getGraphInfo();
                    if (!graphInfo || graphInfo.points.length < 2) return;

                    ctx.save();

                    const { points, getX, getY, min_val, drawX, drawY, drawW, drawH, y, graphSpace, width } = graphInfo;

                    const blackThemeWidget = this.widgets.find(w => w.name === "black_theme");
                    const isBlackTheme = blackThemeWidget ? blackThemeWidget.value : true;

                    const bg_color = isBlackTheme ? "#1e1e1e" : "#ffffff";
                    const grid_color = isBlackTheme ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)";
                    const line_color = isBlackTheme ? "#00d2d3" : "#2e86de";
                    const fill_color = isBlackTheme ? "rgba(0, 210, 211, 0.15)" : "rgba(46, 134, 222, 0.15)";
                    const axis_color = isBlackTheme ? "rgba(212, 212, 212, 0.3)" : "rgba(51, 51, 51, 0.3)";

                    ctx.fillStyle = bg_color;
                    ctx.fillRect(10, y, width - 20, graphSpace);
                    ctx.strokeStyle = axis_color;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(10, y, width - 20, graphSpace);

                    ctx.strokeStyle = grid_color;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    for (let i = 0; i <= 4; i++) {
                        const gridY = drawY + (i / 4) * drawH;
                        ctx.moveTo(drawX, gridY);
                        ctx.lineTo(drawX + drawW, gridY);
                    }
                    for (let i = 0; i <= 4; i++) {
                        const gridX = drawX + (i / 4) * drawW;
                        ctx.moveTo(gridX, drawY);
                        ctx.lineTo(gridX, drawY + drawH);
                    }
                    ctx.stroke();

                    const sigmaStartWidget = this.widgets.find(w => w.name === "sigma_start");
                    const sigmaEndWidget = this.widgets.find(w => w.name === "sigma_end");
                    let pts =[{t: 0, val: sigmaStartWidget ? sigmaStartWidget.value : 1.0}];
                    if (this.customPoints) pts.push(...this.customPoints);
                    pts.push({t: 1, val: sigmaEndWidget ? sigmaEndWidget.value : 0.0});
                    pts.sort((a, b) => a.t - b.t);

                    ctx.strokeStyle = isBlackTheme ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)";
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    for (let i = 0; i < pts.length; i++) {
                        const px = getX(pts[i].t);
                        const py = getY(pts[i].val);
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                    ctx.setLineDash([]);

                    ctx.fillStyle = fill_color;
                    ctx.beginPath();
                    ctx.moveTo(getX(0), getY(min_val));
                    for (let i = 0; i < points.length; i++) {
                        ctx.lineTo(getX(i / (points.length - 1 || 1)), getY(points[i]));
                    }
                    ctx.lineTo(getX(1), getY(min_val));
                    ctx.closePath();
                    ctx.fill();

                    ctx.strokeStyle = line_color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let i = 0; i < points.length; i++) {
                        const px = getX(i / (points.length - 1 || 1));
                        const py = getY(points[i]);
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.stroke();

                    ctx.fillStyle = line_color;
                    for (let i = 0; i < points.length; i++) {
                        const px = getX(i / (points.length - 1 || 1));
                        const py = getY(points[i]);
                        ctx.beginPath();
                        ctx.arc(px, py, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    if (this.customPoints) {
                        for (let i = 0; i < this.customPoints.length; i++) {
                            const pt = this.customPoints[i];
                            const px = getX(pt.t);
                            const py = getY(pt.val);
                            
                            ctx.beginPath();
                            let radius = 5;
                            if (i === this.hoveredPointIndex || i === this.draggedPointIndex) {
                                radius = 7;
                                ctx.fillStyle = isBlackTheme ? "#ffffff" : "#000000";
                                ctx.strokeStyle = line_color;
                                ctx.lineWidth = 2;
                            } else {
                                ctx.fillStyle = isBlackTheme ? "#aaaaaa" : "#666666";
                                ctx.strokeStyle = isBlackTheme ? "#ffffff" : "#000000";
                                ctx.lineWidth = 1.5;
                            }
                            ctx.arc(px, py, radius, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();
                        }
                    }

                    ctx.restore();
                };

                node.updateFromCustomPoints = function() {
                    const stepsWidget = this.widgets.find(w => w.name === "steps");
                    const sigmaStartWidget = this.widgets.find(w => w.name === "sigma_start");
                    const sigmaEndWidget = this.widgets.find(w => w.name === "sigma_end");
                    const smoothWidget = this.widgets.find(w => w.name === "curve_smooth");
                    
                    if (!stepsWidget) return;

                    const steps = stepsWidget.value;
                    const sigma_start = sigmaStartWidget ? sigmaStartWidget.value : 1.0;
                    const sigma_end = sigmaEndWidget ? sigmaEndWidget.value : 0.0;
                    const isSmooth = smoothWidget ? smoothWidget.value : false;

                    let pts =[{t: 0, val: sigma_start}];
                    if (this.customPoints) pts.push(...this.customPoints);
                    pts.push({t: 1, val: sigma_end});
                    pts.sort((a, b) => a.t - b.t);

                    let m =[];
                    for (let j = 0; j < pts.length; j++) {
                        if (j === 0) {
                            let dx = pts[1].t - pts[0].t;
                            m.push(dx === 0 ? 0 : (pts[1].val - pts[0].val) / dx);
                        } else if (j === pts.length - 1) {
                            let dx = pts[j].t - pts[j-1].t;
                            m.push(dx === 0 ? 0 : (pts[j].val - pts[j-1].val) / dx);
                        } else {
                            let dx = pts[j+1].t - pts[j-1].t;
                            m.push(dx === 0 ? 0 : (pts[j+1].val - pts[j-1].val) / dx);
                        }
                    }

                    let newData =[];
                    let min_val = Math.min(sigma_start, sigma_end);
                    let max_val = Math.max(sigma_start, sigma_end);

                    for (let i = 0; i <= steps; i++) {
                        let t_target = steps > 0 ? i / steps : 0;
                        let val = sigma_end;
                        
                        let idx = 0;
                        for (; idx < pts.length - 1; idx++) {
                            if (t_target >= pts[idx].t && t_target <= pts[idx+1].t) break;
                        }
                        if (idx === pts.length - 1) idx--;
                        
                        let p0 = pts[idx];
                        let p1 = pts[idx+1];
                        let h = p1.t - p0.t;
                        
                        if (h === 0) {
                            val = p0.val;
                        } else {
                            let t = (t_target - p0.t) / h;
                            let y_lin = p0.val + t * (p1.val - p0.val);
                            
                            if (!isSmooth) {
                                val = y_lin;
                            } else {
                                let m0 = m[idx];
                                let m1 = m[idx+1];
                                let t2 = t * t;
                                let t3 = t2 * t;
                                let h00 = 2*t3 - 3*t2 + 1;
                                let h10 = t3 - 2*t2 + t;
                                let h01 = -2*t3 + 3*t2;
                                let h11 = t3 - t2;
                                val = p0.val * h00 + h * m0 * h10 + p1.val * h01 + h * m1 * h11;
                            }
                        }
                        val = Math.max(min_val, Math.min(max_val, val));
                        newData.push(val);
                    }
                    
                    node.preserveGraphHeight(() => {
                        let wData = this.widgets.find(w => w.name === "step_data");
                        if (wData) wData.value = JSON.stringify(newData);
                        
                        const showStepsWidget = this.widgets.find(w => w.name === "show_steps");
                        if (showStepsWidget && showStepsWidget.value) {
                            let stepWidgetCount = this.widgets.filter(w => w.name && w.name.startsWith("step_") && w.name !== "step_data").length;
                            let needsRecreate = (stepWidgetCount !== steps + 1);
                            
                            if (needsRecreate) {
                                this.renderStepWidgets();
                            } else {
                                for (let i = 1; i < steps; i++) {
                                    let w = this.widgets.find(w => w.name === `step_${i}`);
                                    if (w) w.value = newData[i];
                                }
                            }
                        }
                    });
                };

                node.onMouseDown = function(event, pos, graphCanvas) {
                    const graphInfo = this.getGraphInfo();
                    if (!graphInfo) return false;
                    const { getX, getY, getT, getVal, min_val, max_val, drawX, drawY, drawW, drawH } = graphInfo;

                    if (!this.customPoints) this.customPoints =[];

                    for (let i = 0; i < this.customPoints.length; i++) {
                        const pt = this.customPoints[i];
                        const px = getX(pt.t);
                        const py = getY(pt.val);
                        const dist = Math.sqrt(Math.pow(pos[0] - px, 2) + Math.pow(pos[1] - py, 2));
                        
                        if (dist < 15) {
                            if (event.shiftKey) {
                                this.customPoints.splice(i, 1);
                                this.updateFromCustomPoints();
                                this.setDirtyCanvas(true, true);
                                return true;
                            } else {
                                this.isDragging = true;
                                this.draggedPointIndex = i;
                                if (this.captureInput) this.captureInput(true);
                                graphCanvas.canvas.style.cursor = "grabbing";
                                return true;
                            }
                        }
                    }

                    if (pos[0] >= drawX && pos[0] <= drawX + drawW && pos[1] >= drawY && pos[1] <= drawY + drawH) {
                        if (!event.shiftKey) {
                            let t = getT(pos[0]);
                            let val = getVal(pos[1]);
                            t = Math.max(0.01, Math.min(0.99, t)); 
                            val = Math.max(Math.min(min_val, max_val), Math.min(Math.max(min_val, max_val), val));
                            
                            this.customPoints.push({t, val});
                            this.customPoints.sort((a, b) => a.t - b.t);
                            this.draggedPointIndex = this.customPoints.findIndex(p => p.t === t && p.val === val);
                            
                            this.isDragging = true;
                            if (this.captureInput) this.captureInput(true);
                            graphCanvas.canvas.style.cursor = "grabbing";
                            this.updateFromCustomPoints();
                            this.setDirtyCanvas(true, true);
                            return true;
                        }
                    }

                    return false;
                };

                node.onMouseMove = function(event, pos, graphCanvas) {
                    if (this.isDragging && event.buttons === 0) {
                        this.isDragging = false;
                        this.draggedPointIndex = undefined;
                        this.hoveredPointIndex = -1;
                        if (this.captureInput) this.captureInput(false);
                        graphCanvas.canvas.style.cursor = "default";
                        this.updateFromCustomPoints();
                        this.setDirtyCanvas(true, true);
                        return false;
                    }

                    const graphInfo = this.getGraphInfo();
                    if (!graphInfo) return false;
                    const { getX, getY, getT, getVal, min_val, max_val } = graphInfo;

                    if (this.isDragging && this.draggedPointIndex !== undefined) {
                        let t = getT(pos[0]);
                        let val = getVal(pos[1]);
                        
                        let min_t = 0.01;
                        let max_t = 0.99;
                        
                        if (this.draggedPointIndex > 0) {
                            min_t = this.customPoints[this.draggedPointIndex - 1].t + 0.01;
                        }
                        if (this.draggedPointIndex < this.customPoints.length - 1) {
                            max_t = this.customPoints[this.draggedPointIndex + 1].t - 0.01;
                        }
                        
                        t = Math.max(min_t, Math.min(max_t, t));
                        val = Math.max(Math.min(min_val, max_val), Math.min(Math.max(min_val, max_val), val));
                        
                        this.customPoints[this.draggedPointIndex] = {t, val};
                        this.updateFromCustomPoints();
                        this.setDirtyCanvas(true, true);
                        return true;
                    } else {
                        let hovered = -1;
                        if (pos[0] >= 0 && pos[0] <= this.size[0] && pos[1] >= 0 && pos[1] <= this.size[1]) {
                            if (this.customPoints) {
                                for (let i = 0; i < this.customPoints.length; i++) {
                                    const pt = this.customPoints[i];
                                    const px = getX(pt.t);
                                    const py = getY(pt.val);
                                    const dist = Math.sqrt(Math.pow(pos[0] - px, 2) + Math.pow(pos[1] - py, 2));
                                    if (dist < 15) {
                                        hovered = i;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (this.hoveredPointIndex !== hovered) {
                            this.hoveredPointIndex = hovered;
                            graphCanvas.canvas.style.cursor = hovered !== -1 ? (event.shiftKey ? "pointer" : "grab") : "default";
                            this.setDirtyCanvas(true, true);
                        }
                        if (hovered !== -1) return true;
                    }
                    return false;
                };

                node.onMouseUp = function(event, pos, graphCanvas) {
                    if (this.isDragging) {
                        this.isDragging = false;
                        this.draggedPointIndex = undefined;
                        this.hoveredPointIndex = -1;
                        if (this.captureInput) this.captureInput(false);
                        graphCanvas.canvas.style.cursor = "default";
                        this.updateFromCustomPoints();
                        this.setDirtyCanvas(true, true);
                        return true;
                    }
                    return false;
                };

                node.onMouseLeave = function(event, pos, graphCanvas) {
                    if (this.hoveredPointIndex !== -1) {
                        this.hoveredPointIndex = -1;
                        graphCanvas.canvas.style.cursor = "default";
                        this.setDirtyCanvas(true, true);
                    }
                };

                const createStepCallback = function(w, index) {
                    return function(v) {
                        const sigmaStartW = node.widgets.find(w => w.name === "sigma_start");
                        const sigmaEndW = node.widgets.find(w => w.name === "sigma_end");
                        const maxVal = Math.max(sigmaStartW ? sigmaStartW.value : 1.0, sigmaEndW ? sigmaEndW.value : 0.0);
                        const minVal = Math.min(sigmaStartW ? sigmaStartW.value : 1.0, sigmaEndW ? sigmaEndW.value : 0.0);
                        
                        if (v > maxVal) {
                            w.value = maxVal;
                            v = maxVal;
                        } else if (v < minVal) {
                            w.value = minVal;
                            v = minVal;
                        }
                        
                        let data = node.getStepData();
                        data[index] = v;
                        node.setStepData(data); 
                        node.setDirtyCanvas(true, true);
                    };
                };

                node.renderStepWidgets = function() {
                    const stepsWidget = node.widgets.find(w => w.name === "steps");
                    const sigmaStartWidget = node.widgets.find(w => w.name === "sigma_start");
                    const sigmaEndWidget = node.widgets.find(w => w.name === "sigma_end");
                    if (!stepsWidget) return;
                    
                    const steps = stepsWidget.value;
                    const sigma_start = sigmaStartWidget ? sigmaStartWidget.value : 1.0;
                    const sigma_end = sigmaEndWidget ? sigmaEndWidget.value : 0.0;
                    const data = node.getStepData();
                    
                    node.removeStepWidgets(); 
                    
                    let dynamic_step = Math.abs(sigma_start - sigma_end) / 100;
                    if (dynamic_step < 0.01) dynamic_step = 0.01;
                    
                    let dummy0 = node.addWidget("number", `step_0`, sigma_start, null, {
                        min: sigma_start, max: sigma_start, step: 0, precision: 2
                    });
                    dummy0.callback = function(v) {
                        const current_sigma_start = node.widgets.find(w => w.name === "sigma_start").value;
                        if (this.value !== current_sigma_start) {
                            this.value = current_sigma_start;
                            node.setDirtyCanvas(true, true);
                        }
                    };

                    for (let i = 1; i < steps; i++) {
                        let val = data[i] !== undefined ? data[i] : sigma_end;
                        let minVal = Math.min(sigma_end, sigma_start);
                        let maxVal = Math.max(sigma_end, sigma_start);
                        if (val < minVal) val = minVal;
                        if (val > maxVal) val = maxVal;
                        
                        let w = node.addWidget("number", `step_${i}`, val, null, {
                            min: minVal, max: maxVal, step: dynamic_step, precision: 2
                        });
                        w.callback = createStepCallback(w, i);
                    }

                    if (steps > 0) {
                        let dummyN = node.addWidget("number", `step_${steps}`, sigma_end, null, {
                            min: sigma_end, max: sigma_end, step: 0, precision: 2
                        });
                        dummyN.callback = function(v) {
                            const current_sigma_end = node.widgets.find(w => w.name === "sigma_end").value;
                            if (this.value !== current_sigma_end) {
                                this.value = current_sigma_end;
                                node.setDirtyCanvas(true, true);
                            }
                        };
                    }
                };

                node.removeStepWidgets = function() {
                    for (let i = node.widgets.length - 1; i >= 0; i--) {
                        const w = node.widgets[i];
                        if (w.name && w.name.startsWith("step_") && w.name !== "step_data") {
                            node.widgets.splice(i, 1);
                        }
                    }
                };

                node.addWidget("button", "📉 Generate Curve", "Generate", () => {
                    node.customPoints =[]; 
                    node.generateCurve();
                });

                node.addWidget("button", "🗑️ Reset Graph", "Reset", () => {
                    node.customPoints =[]; 
                    const curveFactorWidget = node.widgets.find(w => w.name === "curve_factor");
                    if (curveFactorWidget) {
                        curveFactorWidget.value = 0.0;
                    }
                    node.generateCurve(); 
                    node.setDirtyCanvas(true, true);
                });

                node.generateCurve = function() {
                    const stepsWidget = node.widgets.find(w => w.name === "steps");
                    const sigmaStartWidget = node.widgets.find(w => w.name === "sigma_start");
                    const sigmaEndWidget = node.widgets.find(w => w.name === "sigma_end");
                    const curveFactorWidget = node.widgets.find(w => w.name === "curve_factor");
                    
                    if (!stepsWidget) return;

                    const steps = stepsWidget.value;
                    const sigma_start = sigmaStartWidget ? sigmaStartWidget.value : 1.0;
                    const sigma_end = sigmaEndWidget ? sigmaEndWidget.value : 0.0;
                    const curve_factor = curveFactorWidget ? curveFactorWidget.value : 0.0;
                    
                    let newData =[];
                    for (let i = 0; i <= steps; i++) {
                        const t = steps > 0 ? i / steps : 0;
                        let t_prime = t;
                        
                        if (curve_factor > 0) {
                            t_prime = Math.pow(t, 1.0 + curve_factor);
                        } else if (curve_factor < 0) {
                            t_prime = 1.0 - Math.pow(1.0 - t, 1.0 - curve_factor);
                        }
                        
                        let val = sigma_start - t_prime * (sigma_start - sigma_end);
                        val = Math.max(Math.min(val, Math.max(sigma_start, sigma_end)), Math.min(sigma_start, sigma_end));
                        newData.push(val);
                    }
                    
                    node.preserveGraphHeight(() => {
                        let wData = node.widgets.find(w => w.name === "step_data");
                        if (wData) wData.value = JSON.stringify(newData);
                        
                        const showStepsWidget = node.widgets.find(w => w.name === "show_steps");
                        if (showStepsWidget && showStepsWidget.value) {
                            let stepWidgetCount = node.widgets.filter(w => w.name && w.name.startsWith("step_") && w.name !== "step_data").length;
                            let needsRecreate = (stepWidgetCount !== steps + 1);
                            
                            if (needsRecreate) {
                                node.renderStepWidgets();
                            } else {
                                for (let i = 1; i < steps; i++) {
                                    let w = node.widgets.find(w => w.name === `step_${i}`);
                                    if (w) w.value = newData[i];
                                }
                            }
                        } else {
                            node.removeStepWidgets();
                        }
                    });
                };

                node.syncWidgets = function(isConfiguring) {
                    const stepsWidget = node.widgets.find(w => w.name === "steps");
                    if (!stepsWidget) return;
                    const steps = stepsWidget.value;
                    
                    let data = node.getStepData();
                    let needsDataUpdate = false;
                    
                    if (data.length !== steps + 1) {
                        data =[];
                        const sigmaStartWidget = node.widgets.find(w => w.name === "sigma_start");
                        data.push(sigmaStartWidget ? sigmaStartWidget.value : 1.0);
                        for (let i = 1; i < steps; i++) {
                            let w = node.widgets.find(w => w.name === `step_${i}`);
                            data.push(w ? w.value : 0.0);
                        }
                        const sigmaEndWidget = node.widgets.find(w => w.name === "sigma_end");
                        data.push(sigmaEndWidget ? sigmaEndWidget.value : 0.0);
                        needsDataUpdate = true;
                    }
                    
                    if (needsDataUpdate) node.setStepData(data);

                    let action = () => {
                        const showStepsWidget = node.widgets.find(w => w.name === "show_steps");
                        if (showStepsWidget && showStepsWidget.value) {
                            node.renderStepWidgets();
                        } else {
                            node.removeStepWidgets();
                        }
                    };

                    if (isConfiguring) {
                        action();
                    } else {
                        node.preserveGraphHeight(action);
                    }
                };

                const setupWidgets = () => {
                    const stepsWidget = node.widgets ? node.widgets.find(w => w.name === "steps") : null;
                    if (!stepsWidget) {
                        requestAnimationFrame(setupWidgets);
                        return;
                    }

                    if (!node.isRestored && node.size) {
                        const minSize = node.computeSize();
                        node.size[0] = minSize[0];
                        node.size[1] = minSize[1];
                    }

                    const origCallback = stepsWidget.callback;
                    stepsWidget.callback = function(v) {
                        if (origCallback) origCallback.apply(this, arguments);
                        if (node.customPoints && node.customPoints.length > 0) {
                            node.updateFromCustomPoints();
                        } else {
                            node.generateCurve();
                        }
                    };

                    const curveFactorWidget = node.widgets.find(w => w.name === "curve_factor");
                    if (curveFactorWidget) {
                        const origCallback = curveFactorWidget.callback;
                        curveFactorWidget.callback = function(v) {
                            if (origCallback) origCallback.apply(this, arguments);
                            node.customPoints =[];
                            node.generateCurve();
                        };
                    }

                    const curveSmoothWidget = node.widgets.find(w => w.name === "curve_smooth");
                    if (curveSmoothWidget) {
                        const origCallback = curveSmoothWidget.callback;
                        curveSmoothWidget.callback = function(v) {
                            if (origCallback) origCallback.apply(this, arguments);
                            if (node.customPoints && node.customPoints.length > 0) {
                                node.updateFromCustomPoints();
                            }
                            node.setDirtyCanvas(true, true);
                        };
                    }

                    const showStepsWidget = node.widgets.find(w => w.name === "show_steps");
                    if (showStepsWidget) {
                        const origCallback = showStepsWidget.callback;
                        showStepsWidget.callback = function(v) {
                            if (origCallback) origCallback.apply(this, arguments);
                            node.preserveGraphHeight(() => {
                                if (v) node.renderStepWidgets();
                                else node.removeStepWidgets();
                            });
                        };
                    }

                    const blackThemeWidget = node.widgets.find(w => w.name === "black_theme");
                    if (blackThemeWidget) {
                        const origCallback = blackThemeWidget.callback;
                        blackThemeWidget.callback = function(v) {
                            if (origCallback) origCallback.apply(this, arguments);
                            node.setDirtyCanvas(true, true);
                        };
                    }

                    const sigmaStartWidget = node.widgets.find(w => w.name === "sigma_start");
                    if (sigmaStartWidget) {
                        const origCallback = sigmaStartWidget.callback;
                        let prev_start = sigmaStartWidget.value;
                        sigmaStartWidget.callback = function(v) {
                            if (origCallback) origCallback.apply(this, arguments);
                            const dummy0 = node.widgets.find(w => w.name === "step_0");
                            if (dummy0) dummy0.value = v;
                            
                            const sigmaEndWidget = node.widgets.find(w => w.name === "sigma_end");
                            const current_end = sigmaEndWidget ? sigmaEndWidget.value : 0.0;
                            
                            if (node.customPoints && node.customPoints.length > 0) {
                                for (let i = 0; i < node.customPoints.length; i++) {
                                    let pt = node.customPoints[i];
                                    if (prev_start !== current_end) {
                                        let norm = (pt.val - current_end) / (prev_start - current_end);
                                        pt.val = current_end + norm * (v - current_end);
                                    } else {
                                        pt.val = v - pt.t * (v - current_end);
                                    }
                                }
                                node.updateFromCustomPoints();
                            } else {
                                node.generateCurve();
                            }
                            prev_start = v;
                        };
                    }

                    const sigmaEndWidget = node.widgets.find(w => w.name === "sigma_end");
                    if (sigmaEndWidget) {
                        const origCallback = sigmaEndWidget.callback;
                        let prev_end = sigmaEndWidget.value;
                        sigmaEndWidget.callback = function(v) {
                            if (origCallback) origCallback.apply(this, arguments);
                            const steps = node.widgets.find(w => w.name === "steps").value;
                            const dummyN = node.widgets.find(w => w.name === `step_${steps}`);
                            if (dummyN) dummyN.value = v;
                            
                            const sigmaStartWidget = node.widgets.find(w => w.name === "sigma_start");
                            const current_start = sigmaStartWidget ? sigmaStartWidget.value : 1.0;

                            if (node.customPoints && node.customPoints.length > 0) {
                                for (let i = 0; i < node.customPoints.length; i++) {
                                    let pt = node.customPoints[i];
                                    if (current_start !== prev_end) {
                                        let norm = (pt.val - prev_end) / (current_start - prev_end);
                                        pt.val = v + norm * (current_start - v);
                                    } else {
                                        pt.val = current_start - pt.t * (current_start - v);
                                    }
                                }
                                node.updateFromCustomPoints();
                            } else {
                                node.generateCurve();
                            }
                            prev_end = v;
                        };
                    }

                    if (!node.isRestored) {
                        node.generateCurve();
                    } else if (node.getStepData().length === 0) {
                        if (node.customPoints && node.customPoints.length > 0) {
                            node.updateFromCustomPoints();
                        } else {
                            node.generateCurve();
                        }
                    }
                };
                
                requestAnimationFrame(setupWidgets);

                return r;
            };

            const origOnSerialize = nodeType.prototype.onSerialize;
            nodeType.prototype.onSerialize = function(o) {
                if (origOnSerialize) origOnSerialize.apply(this, arguments);
                if (this.getStepData) o.step_data_cache = this.getStepData();
                if (this.customPoints) o.custom_points_cache = JSON.parse(JSON.stringify(this.customPoints));
            };

            const origOnConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = function(info) {
                this.isRestored = true;
                if (origOnConfigure) origOnConfigure.apply(this, arguments);
                if (info.step_data_cache && this.setStepData) this.setStepData(info.step_data_cache);
                if (info.custom_points_cache) this.customPoints = JSON.parse(JSON.stringify(info.custom_points_cache));
                if (this.syncWidgets) this.syncWidgets(true);
            };
        }
    }
});