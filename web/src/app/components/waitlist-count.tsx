import { getHttpClient } from "../../lib/httpClient"

const WaitListCount: React.FC = async () => {
  const fetch = await getHttpClient()
  const { data } = await fetch("/api/waitlist", { method: "GET" })

  return data?.data.count ?? "10+"
}

export default WaitListCount
