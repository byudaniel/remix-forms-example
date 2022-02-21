import { useParams } from 'remix'

export default function Template() {
  const { id } = useParams()

  return <div>Saved template: {id}</div>
}
