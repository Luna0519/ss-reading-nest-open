import { useState } from "react";
import type {
  AppearancePreferences,
  AppearanceTheme,
  ReaderFont
} from "../features/appearance/appearance.js";
import { DEFAULT_APPEARANCE } from "../features/appearance/appearance.js";

const THEMES: Array<{
  value: AppearanceTheme;
  name: string;
  description: string;
  colors: [string, string, string];
}> = [
  {
    value: "forest",
    name: "薄荷森光",
    description: "薄荷绿 · 嫩叶光",
    colors: ["#c9f0d1", "#e8f7bf", "#bdeee2"]
  },
  {
    value: "lavender",
    name: "星雾梦紫",
    description: "薰衣草 · 蓝紫星光",
    colors: ["#ddc8ff", "#cdd9ff", "#eeaddc"]
  },
  {
    value: "peach",
    name: "蜜桃云霞",
    description: "蜜桃粉 · 杏子奶油",
    colors: ["#ffd5e3", "#ffe7ef", "#f4adc7"]
  }
];

const FONTS: Array<{ value: ReaderFont; label: string; preview: string }> = [
  { value: "serif", label: "书页宋体", preview: "故事" },
  { value: "rounded", label: "温柔圆体", preview: "故事" },
  { value: "sans", label: "清晰黑体", preview: "故事" }
];

export function AppearanceSheet(props: {
  value: AppearancePreferences;
  backgroundImage?: string;
  onChange: (next: AppearancePreferences) => void;
  onBackgroundChange: (dataUrl?: string) => void;
  onClose: () => void;
}) {
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState("");
  const patch = (next: Partial<AppearancePreferences>) =>
    props.onChange({ ...props.value, ...next });

  async function chooseBackground(file?: File) {
    if (!file) return;
    setImageBusy(true);
    setImageError("");
    try {
      const dataUrl = await optimizeBackgroundImage(file);
      props.onBackgroundChange(dataUrl);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "背景图片读取失败，请换一张试试。");
    } finally {
      setImageBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop appearance-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="bottom-sheet appearance-sheet"
        role="dialog"
        aria-label="小窝外观"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grip" />
        <header className="appearance-heading">
          <div><span>L&amp;L · APPEARANCE</span><h2>小窝外观</h2></div>
          <button type="button" className="icon-button" aria-label="关闭外观设置" onClick={props.onClose}>×</button>
        </header>

        <section className="appearance-section">
          <div className="appearance-section-title"><strong>主题颜色</strong><span>想换就换，不必只选一种</span></div>
          <div className="theme-choice-grid">
            {THEMES.map((theme) => (
              <button
                key={theme.value}
                type="button"
                className="theme-choice"
                aria-pressed={props.value.theme === theme.value}
                onClick={() => patch({ theme: theme.value })}
              >
                <span className="theme-swatches" aria-hidden="true">
                  {theme.colors.map((color) => <i key={color} style={{ background: color }} />)}
                </span>
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="appearance-section glass-controls">
          <div className="appearance-section-title"><strong>液态玻璃</strong><span>边调边看效果</span></div>
          <RangeControl
            label="透明度"
            value={props.value.glassOpacity}
            min={0.36}
            max={0.92}
            step={0.02}
            display={`${Math.round(props.value.glassOpacity * 100)}%`}
            onChange={(glassOpacity) => patch({ glassOpacity })}
          />
          <RangeControl
            label="磨砂模糊"
            value={props.value.glassBlur}
            min={8}
            max={38}
            step={1}
            display={`${Math.round(props.value.glassBlur)} px`}
            onChange={(glassBlur) => patch({ glassBlur })}
          />
        </section>

        <section className="appearance-section">
          <div className="appearance-section-title"><strong>阅读文字</strong><span>只影响小说正文</span></div>
          <div className="font-choice-grid">
            {FONTS.map((font) => (
              <button
                key={font.value}
                type="button"
                className={`font-choice ${font.value}`}
                aria-pressed={props.value.readerFont === font.value}
                onClick={() => patch({ readerFont: font.value })}
              >
                <b>{font.preview}</b><span>{font.label}</span>
              </button>
            ))}
          </div>
          <RangeControl
            label="正文字号"
            value={props.value.readerScale}
            min={0.9}
            max={1.3}
            step={0.05}
            display={`${Math.round(props.value.readerScale * 100)}%`}
            onChange={(readerScale) => patch({ readerScale })}
          />
          <RangeControl
            label="正文行距"
            value={props.value.readerLineHeight}
            min={1.55}
            max={2.2}
            step={0.05}
            display={props.value.readerLineHeight.toFixed(2)}
            onChange={(readerLineHeight) => patch({ readerLineHeight })}
          />
        </section>

        <section className="appearance-section background-picker">
          <div className="appearance-section-title"><strong>玻璃背景</strong><span>图片只留在当前设备</span></div>
          {props.backgroundImage ? (
            <div className="background-preview" style={{ backgroundImage: `url("${props.backgroundImage}")` }}>
              <span>当前背景</span>
            </div>
          ) : (
            <div className="background-placeholder"><span>☾</span><p>现在使用主题自带的柔光渐变</p></div>
          )}
          <div className="background-actions">
            <label className="source-import-button">
              {imageBusy ? "正在处理…" : "选择一张照片"}
              <input
                type="file"
                accept="image/*"
                disabled={imageBusy}
                onChange={(event) => void chooseBackground(event.target.files?.[0])}
              />
            </label>
            {props.backgroundImage ? (
              <button type="button" className="text-button" onClick={() => props.onBackgroundChange(undefined)}>移除照片</button>
            ) : null}
          </div>
          {imageError ? <p className="appearance-error" role="alert">{imageError}</p> : null}
        </section>

        <div className="appearance-footer">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              props.onChange(DEFAULT_APPEARANCE);
              props.onBackgroundChange(undefined);
            }}
          >
            恢复默认
          </button>
          <button type="button" className="action-primary" onClick={props.onClose}>保存并完成</button>
        </div>
      </section>
    </div>
  );
}

function RangeControl(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="appearance-range">
      <span><strong>{props.label}</strong><output>{props.display}</output></span>
      <input
        aria-label={props.label}
        type="range"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </label>
  );
}

async function optimizeBackgroundImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("请选择一张图片文件。");
  if (file.size > 20 * 1024 * 1024) throw new Error("图片太大啦，请选择 20MB 以内的照片。");
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法处理这张照片。");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("背景图片读取失败，请换一张试试。"));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("这张图片暂时无法使用，请换一张试试。"));
    image.src = source;
  });
}
