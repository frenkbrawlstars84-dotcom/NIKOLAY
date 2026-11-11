type WebGLProfile = { supported: boolean; software: boolean }
let cached: WebGLProfile | undefined
// Probe before mounting geometry/materials, so software devices never compile
// an expensive first frame only to replace it immediately after onCreated.
export function getWebGLProfile(): WebGLProfile {
  if (cached) return cached
  try {
    const context=document.createElement('canvas').getContext('webgl2')
    if(!context)return cached={supported:false,software:false}
    const debug=context.getExtension('WEBGL_debug_renderer_info')
    const renderer=String(context.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:context.RENDERER))
    cached={supported:true,software:/swiftshader|llvmpipe|softpipe|software/i.test(renderer)}
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return cached
  } catch { return cached={supported:false,software:false} }
}
