import React from 'react'
import { Page, Text, View, Document, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { Language, Match } from '@/type'
import moment from 'moment'
import { useSelector } from 'react-redux'
import { RootState } from '../libs/redux/store'
import { MAP_ROUND_NAME } from '../constants'
import { useMatchesTournament } from '../libs/data'
import { Button } from '@mui/material'

// Register Font
Font.register({
  family: 'Sarabun',
  src:
    '/Sarabun-Light.ttf'
})

// Create styles
const styles = StyleSheet.create({
  page: {},
  table: {
    width: '100%',
    fontFamily: 'Sarabun',
    fontSize: 9,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    borderTop: '1px solid #EEE',
    paddingTop: 5,
    paddingBottom: 5,
    alignItems: 'center'
  },
  header: {
    borderTop: 'none',
    marginTop: 15,
    fontWeight: 'bold'
  },
  bold: {
    fontWeight: 'bold',
  },
  // So Declarative and unDRY 👌
  row10: {
    width: '10%',
    textAlign: 'center'
  },
  row25: {
    width: '25%',
  },
  row8: {
    width: '8%',
    textAlign: 'center'
  },
  row5: {
    width: '5%',
    textAlign: 'center'
  },
  row20: {
    width: '20%',
  },
  row15: {
    width: '15%',
  },
})

const MyDocument = ({ data, language }: { data: Match[], language: Language }) => {

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation='landscape'>
        <View style={styles.table}>
          <View style={[styles.row, styles.bold, styles.header]} fixed>

            <Text style={styles.row5}>Match</Text>
            <Text style={styles.row10}>เวลา</Text>
            <Text style={styles.row8}>ประเภท</Text>
            <Text style={styles.row8}>รอบ</Text>

            <Text style={styles.row15}>ผู้แข่งขัน</Text>
            <Text style={styles.row15}>ทีม</Text>
            <Text style={styles.row10}>คะแนน</Text>
            <Text style={styles.row15}>ผู้แข่งขัน</Text>
            <Text style={styles.row15}>ทีม</Text>
            <Text style={styles.row8}>คูปองลูก</Text>
            <Text style={styles.row10}>หมายเหตุ</Text>
          </View>
          {data?.filter((a) => a.matchNumber != undefined)?.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)).map((row, i) => (
            <View key={i} style={styles.row} wrap={false}>
              <Text style={{ ...styles.row5, textAlign: 'center' }}>{row.matchNumber}</Text>
              <View style={styles.row10}>
                <Text style={{ textAlign: 'center' }}>{moment(row?.date).format('DD MMM yy')}</Text>
                <Text>{moment(row?.date).format('HH:mm')}</Text>
              </View>
              <Text style={styles.row8}>{row?.event?.name[language]}</Text>
              <Text style={styles.row8}>{row.step === 'group' ? 'แบ่งกลุ่ม' : MAP_ROUND_NAME[row.round?.toString() as keyof typeof MAP_ROUND_NAME]}</Text>


              <View style={styles.row15}>
                {row.teamA?.players.map((player) => <Text key={player?.id}>{player?.officialName[language]}</Text>)}
              </View>

              <View style={styles.row15}>
                {row.teamA?.players.map((player) => <Text key={player?.id}>{player?.club}</Text>)}
              </View>

              <Text style={styles.row10}>{''}</Text>

              <View style={styles.row15}>
                {row.teamB?.players.map((player) => <Text key={player?.id}>{player?.officialName[language]}</Text>)}
              </View>

              <View style={styles.row15}>
                {row.teamB?.players.map((player) => <Text key={player?.id}>{player?.club}</Text>)}
              </View>

              <Text style={styles.row8}>{row?.shuttlecockUsed}</Text>
              <Text style={styles.row10}>{''}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}

const DownloadDoc = ({ tournamentID }: {tournamentID: string}) => {
  const language: Language = useSelector((state: RootState) => state.app.language)
  const { matches } = useMatchesTournament(tournamentID)

  const generateAndDownloadPDF = async() => {
    // 1. Create the PDF React element
    const pdfDocument = <MyDocument data={matches} language={language}/>

    // 2. Generate the PDF as a Blob object
    // Note: pdf({}) is important to create a blank container before updateContainer (if needed)
    // but in a simple case like this, we can directly convert the React element to a blob.
    const blob = await pdf(pdfDocument).toBlob()

    // 3. Use file-saver to prompt the download
    saveAs(blob, 'match_list.pdf')
  }

  return (
    <Button onClick={generateAndDownloadPDF}>
      Download PDF
    </Button>
  )
}

export default DownloadDoc