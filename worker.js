const MIME_TYPES = {
  ".js": "application/javascript;charset=utf-8",
  ".jsx": "application/javascript;charset=utf-8",
  ".ts": "application/javascript;charset=utf-8",
  ".tsx": "application/javascript;charset=utf-8",
  ".json": "application/json;charset=utf-8",
};

export default {
  async fetch(request, env, ctx) {
    const mime = MIME_TYPES[request.url.slice(request.url.lastIndexOf("."))];

    let response = await env.ASSETS.fetch(request);

    if (mime) {
      response = new Response(response.body, response);
      response.headers.set("x-content-type-options", "nosniff");
      response.headers.set("content-type", mime);
    }

    return response;
  },
};
