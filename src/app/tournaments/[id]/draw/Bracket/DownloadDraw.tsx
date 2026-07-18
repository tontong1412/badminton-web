import React from 'react'
import { Page, Text, View, Document, Font, pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { EventTeam, Language, MatchStep } from '@/type'
import { useEvent } from '@/app/libs/data'
import { Button } from '@mui/material'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/libs/redux/store'

Font.register({ family: 'Sarabun', src: '/Sarabun-Light.ttf' })

// A4 portrait usable area (595 - 2*30 margins)
const PAGE_MARGIN = 30
const USABLE_WIDTH = 535
// Horizontal gap between slot columns that draws the bracket lines
const CONN_W = 18
const LINE_COLOR = '#444'

const ROUND_LABELS: Record<number, string> = {
  1: 'Winner',
  2: 'Final',
  4: 'Semi-final',
  8: 'Quarter-final',
  16: 'Round of 16',
  32: 'Round of 32',
  64: 'Round of 64',
}
const getRoundLabel = (slotCount: number): string =>
  ROUND_LABELS[slotCount] ?? `Round of ${slotCount}`

const getTeamLabel = (slot: EventTeam | string | null | undefined, language: Language): string => {
  if (!slot) return ''
  if (typeof slot === 'string') return slot.toLowerCase() === 'bye' ? 'Bye' : slot
  return slot.players.map((p) => p.officialName?.[language] ?? p.officialName?.en ?? '').join(' / ')
}

interface BracketDocProps {
  slots: (EventTeam | string)[]
  title: string
  eventName: string
  language: Language
}

/**
 * Draws a bracket PDF using absolute positioning.
 *
 * Layout per round:
 *   linePos[0][i]  = bottom Y of entry slot i  (i+1) * CELL_H + LABEL_H
 *   linePos[r][i]  = midpoint of linePos[r-1][2i] and linePos[r-1][2i+1]
 *
 * Connectors between round R and R+1:
 *   - Vertical 1pt line from linePos[R][2i] to linePos[R][2i+1]  (right edge of slot column)
 *   - Horizontal 1pt line from that vertical to the next slot column (linePos[R+1][i])
 */
const BracketDocument = ({ slots, title, eventName, language }: BracketDocProps) => {
  const rawN = slots.length
  const numRounds = Math.ceil(Math.log2(Math.max(rawN, 2)))
  const n = Math.pow(2, numRounds)

  const TITLE_H = 52         // space reserved at top for title + subtitle
  const LABEL_H = 14         // height of round-label row above slots
  const BODY_H = 842 - 2 * PAGE_MARGIN - TITLE_H
  const CELL_H = Math.min(30, Math.floor((BODY_H - LABEL_H) / n))
  const SLOT_W = Math.max(
    50,
    Math.floor((USABLE_WIDTH - CONN_W * numRounds) / (numRounds + 1))
  )
  const fontSize = Math.max(6, Math.min(9, CELL_H / 3.5))
  const totalH = LABEL_H + n * CELL_H

  // Pre-compute Y of the "result line" (bottom border) for each round and slot index.
  // linePos[r][i] is the Y coordinate of the horizontal line for slot i in round r.
  const linePos: number[][] = [
    Array.from({ length: n }, (_, i) => LABEL_H + (i + 1) * CELL_H),
  ]
  for (let r = 1; r <= numRounds; r++) {
    const prev = linePos[r - 1]
    linePos.push(
      Array.from(
        { length: n / Math.pow(2, r) },
        (_, i) => (prev[2 * i] + prev[2 * i + 1]) / 2
      )
    )
  }

  // X position of the left edge of each column (0 = entry column)
  const colX = (col: number) => col * (SLOT_W + CONN_W)

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: 'Sarabun', padding: PAGE_MARGIN }}>
        <Text style={{ fontSize: 14, marginBottom: 3 }}>{title}</Text>
        <Text style={{ fontSize: 9, marginBottom: 8, color: '#666' }}>{eventName}</Text>

        {/* Bracket body — positioned relative so absolute children are anchored here */}
        <View style={{ position: 'relative', height: totalH }}>

          {/* ── Round labels ── */}
          <Text style={{
            position: 'absolute', left: colX(0), top: 0,
            width: SLOT_W, fontSize: 7, color: '#888',
          }}>
            {getRoundLabel(n)}
          </Text>
          {Array.from({ length: numRounds }).map((_, r) => (
            <Text key={`lbl-${r}`} style={{
              position: 'absolute', left: colX(r + 1), top: 0,
              width: SLOT_W, fontSize: 7, color: '#888',
            }}>
              {getRoundLabel(linePos[r + 1].length)}
            </Text>
          ))}

          {/* ── Entry slots (with team names) ── */}
          {slots.map((slot, i) => (
            <View key={`entry-${i}`} style={{
              position: 'absolute',
              left: colX(0),
              top: linePos[0][i] - CELL_H,
              width: SLOT_W,
              height: CELL_H,
              borderBottom: `1px solid ${LINE_COLOR}`,
              paddingLeft: 3,
              paddingTop: Math.max(1, (CELL_H - fontSize * 1.5) / 2),
            }}>
              <Text style={{ fontSize }}>{`${i + 1}. ${getTeamLabel(slot, language)}`}</Text>
            </View>
          ))}

          {/* Pad any extra slots beyond rawN with empty bordered cells */}
          {Array.from({ length: n - rawN }, (_, k) => k + rawN).map((i) => (
            <View key={`pad-${i}`} style={{
              position: 'absolute',
              left: colX(0),
              top: linePos[0][i] - CELL_H,
              width: SLOT_W,
              height: CELL_H,
              borderBottom: '1px solid #ccc',
            }} />
          ))}

          {/* ── Advancement result lines (horizontal marks for next rounds) ── */}
          {Array.from({ length: numRounds }).map((_, r) =>
            linePos[r + 1].map((lineY, i) => (
              <View key={`res-r${r + 1}-${i}`} style={{
                position: 'absolute',
                left: colX(r + 1),
                top: lineY - 1,
                width: SLOT_W,
                height: 1,
                backgroundColor: LINE_COLOR,
              }} />
            ))
          )}

          {/* ── Bracket connector lines ── */}
          {Array.from({ length: numRounds }).map((_, r) =>
            linePos[r + 1].map((lineY, i) => {
              const topY = linePos[r][2 * i]      // Y of upper feeder line
              const botY = linePos[r][2 * i + 1]  // Y of lower feeder line
              // Vertical line sits at the right edge of column r
              const vx = colX(r) + SLOT_W

              return (
                <React.Fragment key={`conn-r${r}-${i}`}>
                  {/* Vertical — connects the two feeder lines */}
                  <View style={{
                    position: 'absolute',
                    left: vx,
                    top: topY - 1,
                    width: 1,
                    height: botY - topY + 1,
                    backgroundColor: LINE_COLOR,
                  }} />
                  {/* Horizontal — runs from vertical to next-round slot */}
                  <View style={{
                    position: 'absolute',
                    left: vx,
                    top: lineY - 1,
                    width: CONN_W + 1,
                    height: 1,
                    backgroundColor: LINE_COLOR,
                  }} />
                </React.Fragment>
              )
            })
          )}

        </View>
      </Page>
    </Document>
  )
}

interface DownloadDrawProps {
  eventID: string
  step: MatchStep.PlayOff | MatchStep.Consolation
}

const DownloadDraw = ({ eventID, step }: DownloadDrawProps) => {
  const { event } = useEvent(eventID)
  const language: Language = useSelector((state: RootState) => state.app.language)

  const handleDownload = async() => {
    if (!event) return
    const slots = step === MatchStep.Consolation ? event.draw?.consolation : event.draw?.ko
    if (!slots || slots.length < 2) return

    const isConsolation = step === MatchStep.Consolation
    const title = isConsolation ? 'Consolation Draw' : 'Knockout Draw'
    const eventName = event.name?.[language] ?? event.name?.en ?? ''
    const filename = isConsolation ? 'consolation_draw.pdf' : 'knockout_draw.pdf'

    const blob = await pdf(
      <BracketDocument
        slots={slots as (EventTeam | string)[]}
        title={title}
        eventName={eventName}
        language={language}
      />
    ).toBlob()
    saveAs(blob, filename)
  }

  return (
    <Button variant="outlined" size="small" onClick={handleDownload}>
      Download Draw
    </Button>
  )
}

export default DownloadDraw
