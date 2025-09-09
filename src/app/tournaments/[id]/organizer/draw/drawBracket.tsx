import { EventTeam } from '@/type'
const height = 50
const lineWidth = 50

interface Props {
  order: (EventTeam|string)[]
  blockWidth?: number
}

const DrawBracket = ({ order, blockWidth = 400 }: Props) => {

  const teamCount = order.length

  return (
    <>
      <div style={{ display: 'flex' }}>
        <div>
          {order.map((team, i) => {
            return(
              <div
                key={i}
                style={{
                  width: `${blockWidth}px`,
                  height: `${height}px`,
                  borderBottom: '1px solid #333',
                  borderRight: i % 2 === 1 ? '1px solid #333' : undefined,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '10px'
                }}>
                <div style={{ marginRight: '5px', width: '20px' }}>{i + 1}</div>
                <div>{(typeof team === 'string') ? team : team.id}</div>
                {/* <div><EditOutlined /></div> */}
              </div>
            )
          })}
        </div>

        {
          Array.apply(null, Array(Math.ceil(Math.log2(teamCount || 1)))).map((round, i) => (
            <div key={`round-${i}`} style={{ paddingTop: `${(height / 2) + (i < 3 ? i : Math.pow(2, i - 1)) * height}px` }}>
              {Array.apply(null, Array(teamCount - (i < 3 ? i : Math.pow(2, i - 1)))).map((team, j) => {
                return <div
                  key={`key-${i * teamCount - (i < 3 ? i : Math.pow(2, i - 1)) + j}`}
                  style={{
                    width: `${lineWidth}px`,
                    height: `${height}px`,
                    borderLeft: ((i !== 0) && (j % Math.pow(2, i + 1) < Math.pow(2, i)) ? '1px solid #333' : undefined),
                    borderBottom: j % Math.pow(2, i + 1) === (i < 2 ? 0 : Math.pow(2, i - 1) - 1) ? '1px solid #333' : undefined
                  }} />
              })}
            </div>
          ))
        }


      </div>
    </>
  )
}
export default DrawBracket