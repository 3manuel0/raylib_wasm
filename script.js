function make_environment(env) {
  return new Proxy(env, {
      get(target, prop, receiver) {
          if (env[prop] !== undefined) {
              return env[prop].bind(env);
          }
          return (...args) => {
              throw new Error(`NOT IMPLEMENTED: ${prop} ${args}`);
          }
      }
  });
}
let wasm;
let canvas;
let ctx;
let previous;
let dt;
const str_len = (mem, str_ptr) => {
  let len = 0;
  while(mem[str_ptr] != 0){
    len++;
    str_ptr++;
  }
  return len;
}
const get_str = (str_ptr) => {
  const buffer = wasm.instance.exports.memory.buffer;
  const mem = new Uint8Array(buffer);
  const len = str_len(mem, str_ptr) 
  const str_bytes = new Uint8Array(buffer, str_ptr, len);
  return new TextDecoder().decode(str_bytes);
}
const importObject = {
    my_namespace: { imported_func: (arg) => console.log(arg) },
  };
WebAssembly.instantiateStreaming(fetch("game.wasm"),{
  env:make_environment({
  InitWindow : (width, height, str_ptr) => {
    canvas.width = width;
    canvas.height = height;
    document.title = get_str(str_ptr);
    console.log(width, height, get_str(str_ptr));
  },
  BeginDrawing : () => {},
  EndDrawing : () => {},
  GetScreenWidth : () =>{ 
    console.log(ctx.width)
    return canvas.width;
  },
  GetScreenHeight : () =>{
    console.log(ctx.height)
    return canvas.height;
  },
  ClearBackground : (color_ptr) => {
    const buffer = wasm.instance.exports.memory.buffer;
    const [r, g, b, a] = new Uint8Array(buffer, color_ptr, 4);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  },
  SetTargetFPS : (fps) => {console.log(fps)},
  GetFrameTime : () => {
    console.log(dt)
    return dt;
  },
  DrawRectangle : (x, y, w, h, color_ptr) => {
    const buffer = wasm.instance.exports.memory.buffer;
    // const [x, y, w, h] = new Float32Array(buffer, rect_ptr, 4);
    const [r, g, b, a] = new Uint8Array(buffer, color_ptr, 4);
    const color  = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    ctx.beginPath(); // Start a new path
    ctx.rect(x, y, w, h); // Add a rectangle to the current path
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    ctx.fill(); //
    console.log({x, y, w, h}, color);

  }


})
}).then(
    (w) => {
      wasm = w;
      canvas = document.getElementById("canvas")
      ctx = canvas.getContext("2d");
      const {GameInit, GameFrame} = w.instance.exports;
        // console.log(addStruct(20, 12.1));
      GameInit();
      const first = (timestamp) => {
          previous = timestamp;
          window.requestAnimationFrame(next)
        }
        const next = (timestamp) => {
          dt = (timestamp - previous) / 1000.0;
          previous = timestamp;
          GameFrame();
          window.requestAnimationFrame(next)
        }
        window.requestAnimationFrame(first);
        // console.log(w.instance.exports.memory.buffer);   
      },
  );