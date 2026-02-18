export default {
  async fetch(_request: Request, _env: Env): Promise<Response> {
    return new Response('not implemented', { status: 501 });
  },
};

export interface Env {
  SCRIPTS: KVNamespace;
}
