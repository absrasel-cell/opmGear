"use client";

import React, { useEffect, useRef, useState } from "react";

type Texture = {
  id: string;
  name: string;
  dataUrl: string; // embedded data URL to avoid CORS-tainted canvas
};

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

export default function SketchBuilderPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const [textures, setTextures] = useState<Texture[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fillColor, setFillColor] = useState<string>("#c0c0c0");
  const [selectedTextureId, setSelectedTextureId] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Load a demo SVG if available in public/window.svg
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/window.svg");
        if (!res.ok) return;
        const text = await res.text();
        if (!cancelled) setSvgMarkup(text);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Insert click handlers into the rendered SVG to support selection
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const svgEl = root.querySelector("svg");
    if (!svgEl) return;

    // Ensure there is a <defs> for patterns
    let defs = svgEl.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svgEl.insertBefore(defs, svgEl.firstChild);
    }

    const selectable = svgEl.querySelectorAll<SVGGraphicsElement>(
      "path, rect, circle, ellipse, polygon, polyline"
    );

    selectable.forEach((el, index) => {
      if (!el.id) {
        el.id = `node-${index}`;
      }
      el.style.cursor = "pointer";
      el.addEventListener("click", handleElementClick);
    });

    function handleElementClick(e: Event) {
      e.stopPropagation();
      const target = e.currentTarget as SVGGraphicsElement;
      const id = target.id;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        highlightSelection(svgEl, next);
        return next;
      });
    }

    // Click on empty space clears selection
    const clearSelection = () => {
      setSelectedIds(new Set());
      highlightSelection(svgEl, new Set());
    };
    svgEl.addEventListener("click", (e) => {
      if (e.target === svgEl) clearSelection();
    });

    // initial highlight
    highlightSelection(svgEl, selectedIds);

    return () => {
      selectable.forEach((el) => {
        el.replaceWith(el.cloneNode(true)); // drop listeners
      });
    };
  }, [svgMarkup]);

  const applyFill = () => {
    setError("");
    const root = containerRef.current;
    if (!root) return;
    const svgEl = root.querySelector("svg");
    if (!svgEl) return;

    // Ensure <defs>
    let defs = svgEl.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svgEl.insertBefore(defs, svgEl.firstChild);
    }

    const useTexture = selectedTextureId && textures.find((t) => t.id === selectedTextureId);
    let fillValue = fillColor;

    if (useTexture) {
      const tex = useTexture;
      const patternId = `tex-${tex.id}`;
      let pattern = svgEl.querySelector(`#${patternId}`) as SVGPatternElement | null;
      if (!pattern) {
        pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
        pattern.setAttribute("id", patternId);
        pattern.setAttribute("patternUnits", "objectBoundingBox");
        pattern.setAttribute("width", "0.2");
        pattern.setAttribute("height", "0.2");
        const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
        image.setAttributeNS("http://www.w3.org/1999/xlink", "href", tex.dataUrl);
        image.setAttribute("width", "100");
        image.setAttribute("height", "100");
        pattern.appendChild(image);
        defs!.appendChild(pattern);
      }
      fillValue = `url(#${patternId})`;
    }

    selectedIds.forEach((id) => {
      const el = svgEl.querySelector<SVGGraphicsElement>(`#${CSS.escape(id)}`);
      if (el) {
        (el as any).style.fill = fillValue;
      }
    });
  };

  const exportPNG = async () => {
    setError("");
    const root = containerRef.current;
    if (!root) return;
    const svgEl = root.querySelector("svg");
    if (!svgEl) return;

    const cloned = svgEl.cloneNode(true) as SVGSVGElement;
    // Ensure width/height for rasterization
    const vb = cloned.getAttribute("viewBox");
    let width = parseInt(cloned.getAttribute("width") || "0", 10);
    let height = parseInt(cloned.getAttribute("height") || "0", 10);
    if ((!width || !height) && vb) {
      const parts = vb.split(/\s+/).map(Number);
      if (parts.length === 4) {
        width = parts[2];
        height = parts[3];
      }
    }
    if (!width || !height) {
      width = 1000;
      height = 1000;
    }

    const serialized = new XMLSerializer().serializeToString(cloned);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "sketch.png";
        a.click();
      } catch (e: any) {
        setError(e?.message || "Failed to export PNG");
      }
    };
    img.onerror = () => {
      setError("Failed to load SVG for export");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleSvgFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setSvgMarkup(text);
      setSelectedIds(new Set());
    } catch (e: any) {
      setError(e?.message || "Failed to read SVG file");
    }
  };

  const handleTextureFiles = async (files?: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const next: Texture[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await readFileAsDataURL(file);
        next.push({ id: crypto.randomUUID(), name: file.name, dataUrl });
      }
      setTextures((prev) => [...prev, ...next]);
    } catch (e: any) {
      setError(e?.message || "Failed to read texture files");
    }
  };

  const selectionCount = selectedIds.size;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Sketch Builder</h1>
      <p className="text-sm text-gray-600">
        Upload an SVG and optional textures. Click shapes to select; apply a
        color or texture; export as PNG. This is an MVP and can be extended to
        parameterize by data later.
      </p>

      {error ? (
        <div className="p-3 rounded bg-red-100 text-red-800">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4 md:col-span-1">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Load SVG</label>
            <input
              type="file"
              accept="image/svg+xml,.svg"
              onChange={(e) => handleSvgFile(e.target.files?.[0])}
            />
            <textarea
              className="w-full h-40 border rounded p-2 text-sm"
              placeholder="Paste SVG markup here"
              value={svgMarkup}
              onChange={(e) => setSvgMarkup(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Upload Textures</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleTextureFiles(e.target.files)}
            />
            <div className="flex flex-wrap gap-2">
              {textures.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTextureId(t.id)}
                  className={`border rounded p-1 ${
                    selectedTextureId === t.id ? "ring-2 ring-blue-500" : ""
                  }`}
                  title={t.name}
                >
                  <img src={t.dataUrl} alt={t.name} className="w-12 h-12 object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Fill Color</label>
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
            />
            <div className="text-xs text-gray-600">Selecting a texture overrides color.</div>
          </div>

          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
              onClick={applyFill}
              disabled={selectionCount === 0}
            >
              Apply to {selectionCount || 0} selected
            </button>
            <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={exportPNG}>
              Export PNG
            </button>
            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() => {
                setSelectedTextureId("");
              }}
            >
              Clear Texture
            </button>
          </div>
        </div>

        <div className="md:col-span-2 border rounded p-3 bg-white">
          <div className="mb-2 text-sm text-gray-600">
            Selected: {selectionCount} element{selectionCount === 1 ? "" : "s"}
          </div>
          <div ref={containerRef} className="overflow-auto max-h-[70vh]">
            {/* Render SVG markup safely into the DOM */}
            <div
              dangerouslySetInnerHTML={{ __html: svgMarkup || "" }}
              className="[&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[70vh]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function highlightSelection(svgEl: Element, selected: Set<string>) {
  const nodes = svgEl.querySelectorAll<SVGGraphicsElement>(
    "path, rect, circle, ellipse, polygon, polyline"
  );
  nodes.forEach((el) => {
    const id = el.id;
    if (id && selected.has(id)) {
      (el as any).style.outline = "2px solid #3b82f6"; // blue outline
      (el as any).style.filter = "drop-shadow(0 0 2px rgba(59,130,246,0.8))";
    } else {
      (el as any).style.outline = "none";
      (el as any).style.filter = "none";
    }
  });
}

