const gallery = document.getElementById("gallery");

window.addEventListener("scroll", () => {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  gallery.style.transform = `translate(${-scrollX}px, ${-scrollY}px)`;
});
