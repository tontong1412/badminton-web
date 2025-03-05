const GET = async() => {
  // eslint-disable-next-line no-constant-condition
  if (true) throw('error...  ')
  return new Response('okie')
}
export { GET }