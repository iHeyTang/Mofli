import variants from "./cat-studies/masters.json";
const assets = import.meta.glob("./cat-studies/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
});
const views = ["front", "three-quarter", "side"];
const labels = ["正面", "四分之三侧面", "侧面"];
function svg(v, i, size) {
  const eyes = v.eyes[i]
    .map(
      ([x, y, w, h]) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="#f9f9f6"/>`,
    )
    .join("");
  return `<svg class="pet" ${size ? `width="${size}" height="${size}"` : ""} viewBox="0 0 300 300" role="img" aria-label="${v.name} · ${labels[i]}"><path fill="#101311" d="${v.paths[i]}"/>${eyes}</svg>`;
}
document.querySelector("#studies").innerHTML = variants
  .map(
    (v) =>
      `<article class="study" data-variant="${v.id}"><div class="identity"><span class="number">DIRECTION ${v.id.toUpperCase()}</span><h2>${v.name}</h2><p>${v.note}</p><button aria-pressed="false">选择 ${v.id.toUpperCase()} 方向</button></div>${views.map((view, i) => `<figure class="portrait">${svg(v, i)}<figcaption><span>${labels[i]}</span><a href="${assets[`./cat-studies/${v.id}-${view}.svg`]}" download="mofli-cat-${v.id}-${view}.svg">下载 SVG</a></figcaption></figure>`).join("")}<div class="sizes"><span>实际显示尺寸</span>${[32, 64, 96].map((n) => `<div class="mini">${svg(v, 0, n)}<span>${n}px</span></div>`).join("")}</div></article>`,
  )
  .join("");
document
  .querySelector("#outline")
  .addEventListener("change", (e) =>
    document.body.classList.toggle("outline", e.target.checked),
  );
document.querySelectorAll(".study button").forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll(".study").forEach((row) => {
      const selected = row.contains(button);
      row.classList.toggle("chosen", selected);
      row
        .querySelector("button")
        .setAttribute("aria-pressed", String(selected));
    });
    document.querySelector("#choice").textContent =
      `已标记 ${button.closest(".study").dataset.variant.toUpperCase()} 方向 · 尚未应用到动画`;
  }),
);

// Direction A was selected by the project owner.
document.querySelector('[data-variant="a"] button').click();
document.querySelector("#choice").textContent =
  "已选定 A 软团 · 正在作为猫头母版";
