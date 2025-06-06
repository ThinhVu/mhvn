import axios from "axios";

export default {
  async config() {
    const {ENV_URL, ENV_API_KEY, ENV_NAME} = process.env
    if (ENV_NAME && ENV_URL && ENV_API_KEY) {
      console.log('remote-env: fetching', ENV_NAME)
      const url = `${ENV_URL}?apiKey=${ENV_API_KEY}&key=${ENV_NAME}`
      const {data} = await axios.get(url)
      Object.assign(process.env, data)
      console.log('remote-env: completed')
    }
  }
}