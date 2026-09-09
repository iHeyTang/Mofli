const states = ["Idle", "Curious", "Startled"];
const designs = [
  {
    id: "a",
    name: "Mallow",
    note: "低重心 · 小眼睛 · 宽眼距",
    detail:
      "A soft little marshmallow: low and settled at rest, leaning with curiosity, stretching tall when startled.",
    paths: [
      "M 42 164 C 42 115 75 93 124 94 C 170 88 205 116 211 159 C 218 194 185 209 128 209 C 72 209 37 198 42 164 Z",
      "M 47 170 C 48 128 75 107 119 96 C 167 78 203 104 211 149 C 221 183 191 202 135 209 C 77 216 42 205 47 170 Z",
      "M 62 163 C 60 108 76 64 122 62 C 166 58 193 99 194 155 C 201 196 177 211 128 212 C 84 213 61 201 62 163 Z",
    ],
    eyes: [
      [94, 157, 162, 157],
      [113, 148, 177, 137],
      [99, 132, 157, 132],
    ],
  },
  {
    id: "b",
    name: "Pip",
    note: "偏心轮廓 · 高低眼 · 一侧饱满",
    detail:
      "不是对称的圆球，而是一颗轻轻歪着的豆子。弯曲的一侧形成固定辨识点，像总在侧耳听。",
    paths: [
      "M 64 187 C 35 155 51 104 82 75 C 107 53 141 61 148 91 C 150 110 176 113 190 130 C 226 174 197 210 148 214 C 109 218 80 207 64 187 Z",
      "M 61 186 C 38 151 66 96 105 73 C 135 54 165 72 162 102 C 162 120 190 119 201 145 C 223 187 190 213 144 214 C 105 215 76 207 61 186 Z",
      "M 72 190 C 49 164 53 95 80 66 C 102 41 136 50 145 79 C 152 100 178 96 191 127 C 215 179 190 212 146 215 C 111 217 86 208 72 190 Z",
    ],
    eyes: [
      [99, 135, 155, 150],
      [123, 125, 174, 143],
      [102, 119, 157, 135],
    ],
  },
  {
    id: "c",
    name: "Pebble",
    note: "圆角方身 · 白色眼窝 · 墨点瞳孔",
    detail:
      "像一块被磨圆的小石头。眼窝保留白色留白，让瞳孔承担追视，身体只做轻微的迟缓跟随。",
    paths: [
      "M 49 118 C 52 88 77 86 127 87 C 181 85 204 91 207 122 L 211 176 C 212 203 187 211 128 210 C 67 213 43 203 45 178 Z",
      "M 49 134 C 48 102 74 99 124 89 C 175 77 200 82 206 114 L 216 168 C 223 194 198 208 138 215 C 78 223 50 213 50 187 Z",
      "M 65 100 C 65 70 89 65 128 66 C 171 64 191 76 191 106 L 197 177 C 199 205 176 214 129 213 C 81 216 59 205 60 178 Z",
    ],
    eyes: [
      [99, 145, 157, 145],
      [113, 139, 170, 127],
      [105, 127, 157, 127],
    ],
  },
];
function svg(d, s) {
  const [x, y, x2, y2] = d.eyes[s];
  const eye = (cx, cy) =>
    d.id === "c"
      ? `<ellipse cx="${cx}" cy="${cy}" rx="${s === 2 ? 21 : 23}" ry="${s === 2 ? 28 : 22}" fill="#f9f9f6"/><ellipse cx="${cx + (s === 1 ? 7 : 0)}" cy="${cy - (s === 1 ? 3 : 0)}" rx="${s === 2 ? 6 : 7}" ry="${s === 2 ? 10 : 8}" fill="currentColor"/>`
      : `<ellipse cx="${cx}" cy="${cy}" rx="${s === 2 ? 10 : 6}" ry="${s === 2 ? 17 : 8}" fill="#f9f9f6"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${d.name} · ${states[s]}" color="#20231f"><path fill="currentColor" d="${d.paths[s]}"/><g class="features">${eye(x, y)}${eye(x2, y2)}</g></svg>`;
}
const root = document.querySelector("#studies");
for (const d of designs) {
  const row = document.createElement("article");
  row.className = "study";
  row.dataset.id = d.id;
  row.innerHTML = `<div class="identity"><span class="number">DIRECTION ${d.id.toUpperCase()}</span><h2>${d.name}</h2><p>${d.note}<br>${d.detail}</p><button type="button" aria-pressed="false">选择${d.name}</button></div>`;
  states.forEach((state, s) => {
    const figure = document.createElement("figure");
    figure.className = "portrait";
    figure.innerHTML = svg(d, s);
    const caption = document.createElement("figcaption");
    caption.textContent = state + " · ";
    const a = document.createElement("a");
    a.textContent = "下载 SVG";
    a.href = URL.createObjectURL(
      new Blob([svg(d, s)], { type: "image/svg+xml" }),
    );
    a.download = `mofli-${d.id}-${s}.svg`;
    caption.append(a);
    figure.append(caption);
    row.append(figure);
  });
  const sizes = document.createElement("div");
  sizes.className = "sizes";
  sizes.innerHTML =
    "<span>实际显示尺寸</span>" +
    [32, 48, 64]
      .map(
        (size) =>
          `<div class="mini"><div style="width:${size}px;height:${size}px">${svg(d, 0)}</div><span>${size} px</span></div>`,
      )
      .join("");
  row.append(sizes);
  root.append(row);
  row.querySelector("button").addEventListener("click", () => {
    try {
      localStorage.setItem("mofli-character-direction", d.id);
    } catch {}
    select(d.id);
  });
}
function select(id) {
  const d = designs.find((d) => d.id === id);
  if (!d) return;
  document.querySelectorAll(".study").forEach((row) => {
    const active = row.dataset.id === id;
    row.classList.toggle("chosen", active);
    row.querySelector("button").setAttribute("aria-pressed", String(active));
  });
  document.querySelector("#choice").textContent =
    `已选 ${d.name} · 仅记录方向，不改变当前宠物`;
}
try {
  select(localStorage.getItem("mofli-character-direction"));
} catch {}
document
  .querySelector("#silhouette")
  .addEventListener("change", (e) =>
    document.body.classList.toggle("silhouette", e.target.checked),
  );
