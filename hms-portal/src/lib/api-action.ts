export async function sendJson(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status})`)
  }
  return payload
}
