'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Tabs,
  Tab,
  Divider,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Stack,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { BookingStatus, PaymentStatus, User } from '@/type'
import { useVenue, useCourts, useVenueBookings, useVenueAnalytics } from '../../../../libs/data'
import moment from 'moment'
import { saveAs } from 'file-saver'
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer'
import { useParams, useRouter } from 'next/navigation'
import Layout from '../../../../components/Layout/index'
import { useSelector } from 'react-redux'
import { RootState } from '../../../../libs/redux/store'
import { useTranslation } from 'react-i18next'

type DateRange = 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

interface MonthlyReportRow {
  monthKey: string;
  monthLabel: string;
  totalBookings: number;
  paidBookings: number;
  cancelledBookings: number;
  paidRevenue: number;
  discountTotal: number;
  bookedMinutes: number;
  utilisationPct: number;
}

interface CourtRankingRow {
  courtID: string;
  courtName: string;
  paidRevenue: number;
  bookedMinutes: number;
  utilisationPct: number;
}

interface TopCustomerRow {
  customerKey: string;
  customerLabel: string;
  bookings: number;
  paidRevenue: number;
}

type ExportMode = 'full' | 'accounting'
type PdfVatMode = 'withVat' | 'withoutVat'
type PdfExportMode = 'fullWithVat' | 'fullWithoutVat' | 'accountingWithVat' | 'accountingWithoutVat'

interface ReportPdfText {
  title: string;
  period: string;
  accountingSummary: string;
  paidRevenue: string;
  discountTotal: string;
  cancelledBookings: string;
  monthOverMonthGrowth: string;
  monthlyBreakdown: string;
  month: string;
  bookings: string;
  discounts: string;
  utilisation: string;
  strategicHighlights: string;
  topDemandDay: string;
  topDemandHour: string;
  forecast: string;
  topCourtsByRevenue: string;
  taxWorksheetTitle: string;
  generatedAt: string;
  sellerName: string;
  sellerAddress: string;
  sellerTaxId: string;
  sellerTaxIdUnavailable: string;
  vatRate: string;
  netAmountExVat: string;
  vatAmount: string;
  grossAmountIncVat: string;
  amountNoVat: string;
  vatNotApplied: string;
  paidTransactions: string;
  docNo: string;
  serviceDate: string;
  customer: string;
  gross: string;
  net: string;
  vat: string;
}

interface TaxWorksheetRow {
  docNo: string;
  serviceDate: string;
  customer: string;
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
}

Font.register({
  family: 'Sarabun',
  src: '/Sarabun-Light.ttf',
})

const reportPdfStyles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    fontFamily: 'Sarabun',
  },
  title: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 700,
  },
  subtitle: {
    marginBottom: 12,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 700,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1px solid #333',
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #ddd',
    paddingBottom: 4,
    marginBottom: 4,
  },
  cMonth: { width: '20%' },
  cCount: { width: '16%', textAlign: 'right' },
  cRev: { width: '24%', textAlign: 'right' },
  cUtil: { width: '16%', textAlign: 'right' },
  cDocNo: { width: '16%' },
  cDate: { width: '16%' },
  cCustomer: { width: '24%' },
  cAmt: { width: '14%', textAlign: 'right' },
  cAmtWide: { width: '42%', textAlign: 'right' },
})

function ReportPdfDocument(props: {
  venueName: string;
  venueAddress: string;
  periodText: string;
  currency: string;
  paidRevenue: number;
  discountTotal: number;
  cancelledCount: number;
  growthPct: number | null;
  monthlyRows: MonthlyReportRow[];
  exportMode: ExportMode;
  topDemandDay: string;
  topDemandHour: string;
  forecastLabel: string;
  forecastRevenue: number;
  forecastBookings: number;
  courtRanking: CourtRankingRow[];
  taxRows: TaxWorksheetRow[];
  netAmountExVat: number;
  vatAmount: number;
  grossAmountIncVat: number;
  pdfVatMode: PdfVatMode;
  generatedAtText: string;
  text: ReportPdfText;
}) {
  const {
    venueName,
    venueAddress,
    periodText,
    currency,
    paidRevenue,
    discountTotal,
    cancelledCount,
    growthPct,
    monthlyRows,
    exportMode,
    topDemandDay,
    topDemandHour,
    forecastLabel,
    forecastRevenue,
    forecastBookings,
    courtRanking,
    taxRows,
    netAmountExVat,
    vatAmount,
    grossAmountIncVat,
    pdfVatMode,
    generatedAtText,
    text,
  } = props
  const fmtPrice = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
  const withVat = pdfVatMode === 'withVat'
  return (
    <Document>
      <Page size="A4" style={reportPdfStyles.page}>
        <Text style={reportPdfStyles.title}>{text.title}</Text>
        <Text style={reportPdfStyles.subtitle}>{venueName}</Text>
        <Text style={reportPdfStyles.subtitle}>{text.period}: {periodText}</Text>

        <Text style={reportPdfStyles.sectionTitle}>{text.accountingSummary}</Text>
        <View style={reportPdfStyles.row}><Text>{text.paidRevenue}</Text><Text>{fmtPrice(paidRevenue)} {currency}</Text></View>
        <View style={reportPdfStyles.row}><Text>{text.discountTotal}</Text><Text>{fmtPrice(discountTotal)} {currency}</Text></View>
        <View style={reportPdfStyles.row}><Text>{text.cancelledBookings}</Text><Text>{cancelledCount}</Text></View>
        <View style={reportPdfStyles.row}>
          <Text>{text.monthOverMonthGrowth}</Text>
          <Text>{growthPct === null ? 'N/A' : `${growthPct > 0 ? '+' : ''}${growthPct}%`}</Text>
        </View>

        <Text style={reportPdfStyles.sectionTitle}>{text.monthlyBreakdown}</Text>
        <View style={reportPdfStyles.tableHeader}>
          <Text style={reportPdfStyles.cMonth}>{text.month}</Text>
          <Text style={reportPdfStyles.cCount}>{text.bookings}</Text>
          <Text style={reportPdfStyles.cRev}>{text.paidRevenue}</Text>
          <Text style={reportPdfStyles.cRev}>{text.discounts}</Text>
          <Text style={reportPdfStyles.cUtil}>{text.utilisation}</Text>
        </View>
        {monthlyRows.map((row) => (
          <View style={reportPdfStyles.tableRow} key={row.monthKey}>
            <Text style={reportPdfStyles.cMonth}>{row.monthLabel}</Text>
            <Text style={reportPdfStyles.cCount}>{row.totalBookings}</Text>
            <Text style={reportPdfStyles.cRev}>{fmtPrice(row.paidRevenue)} {currency}</Text>
            <Text style={reportPdfStyles.cRev}>{fmtPrice(row.discountTotal)} {currency}</Text>
            <Text style={reportPdfStyles.cUtil}>{row.utilisationPct}%</Text>
          </View>
        ))}

        <Text style={reportPdfStyles.sectionTitle}>{text.taxWorksheetTitle}</Text>
        <View style={reportPdfStyles.row}><Text>{text.generatedAt}</Text><Text>{generatedAtText}</Text></View>
        <View style={reportPdfStyles.row}><Text>{text.sellerName}</Text><Text>{venueName}</Text></View>
        <View style={reportPdfStyles.row}><Text>{text.sellerAddress}</Text><Text>{venueAddress}</Text></View>
        <View style={reportPdfStyles.row}><Text>{text.sellerTaxId}</Text><Text>{text.sellerTaxIdUnavailable}</Text></View>
        <View style={reportPdfStyles.row}><Text>{text.vatRate}</Text><Text>{withVat ? '7%' : text.vatNotApplied}</Text></View>
        <View style={reportPdfStyles.row}><Text>{withVat ? text.netAmountExVat : text.amountNoVat}</Text><Text>{fmtPrice(netAmountExVat)} {currency}</Text></View>
        <View style={reportPdfStyles.row}><Text>{text.vatAmount}</Text><Text>{fmtPrice(vatAmount)} {currency}</Text></View>
        <View style={reportPdfStyles.row}><Text>{withVat ? text.grossAmountIncVat : text.amountNoVat}</Text><Text>{fmtPrice(grossAmountIncVat)} {currency}</Text></View>

        <Text style={reportPdfStyles.sectionTitle}>{text.paidTransactions}</Text>
        <View style={reportPdfStyles.tableHeader}>
          <Text style={reportPdfStyles.cDocNo}>{text.docNo}</Text>
          <Text style={reportPdfStyles.cDate}>{text.serviceDate}</Text>
          <Text style={reportPdfStyles.cCustomer}>{text.customer}</Text>
          {withVat ? (
            <>
              <Text style={reportPdfStyles.cAmt}>{text.gross}</Text>
              <Text style={reportPdfStyles.cAmt}>{text.net}</Text>
              <Text style={reportPdfStyles.cAmt}>{text.vat}</Text>
            </>
          ) : (
            <Text style={reportPdfStyles.cAmtWide}>{text.amountNoVat}</Text>
          )}
        </View>
        {taxRows.map((row, idx) => (
          <View style={reportPdfStyles.tableRow} key={`${row.docNo}-${row.serviceDate}-${idx}`}>
            <Text style={reportPdfStyles.cDocNo}>{row.docNo}</Text>
            <Text style={reportPdfStyles.cDate}>{row.serviceDate}</Text>
            <Text style={reportPdfStyles.cCustomer}>{row.customer}</Text>
            {withVat ? (
              <>
                <Text style={reportPdfStyles.cAmt}>{fmtPrice(row.grossAmount)}</Text>
                <Text style={reportPdfStyles.cAmt}>{fmtPrice(row.netAmount)}</Text>
                <Text style={reportPdfStyles.cAmt}>{fmtPrice(row.vatAmount)}</Text>
              </>
            ) : (
              <Text style={reportPdfStyles.cAmtWide}>{fmtPrice(row.grossAmount)}</Text>
            )}
          </View>
        ))}

        {exportMode === 'full' && (
          <>
            <Text style={reportPdfStyles.sectionTitle}>{text.strategicHighlights}</Text>
            <View style={reportPdfStyles.row}><Text>{text.topDemandDay}</Text><Text>{topDemandDay}</Text></View>
            <View style={reportPdfStyles.row}><Text>{text.topDemandHour}</Text><Text>{topDemandHour}</Text></View>
            <View style={reportPdfStyles.row}><Text>{text.forecast}</Text><Text>{forecastLabel}: {forecastBookings} {text.bookings}, {fmtPrice(forecastRevenue)} {currency}</Text></View>

            <Text style={reportPdfStyles.sectionTitle}>{text.topCourtsByRevenue}</Text>
            {courtRanking.slice(0, 5).map((court) => (
              <View style={reportPdfStyles.row} key={court.courtID}>
                <Text>{court.courtName}</Text>
                <Text>{fmtPrice(court.paidRevenue)} {currency} · {court.utilisationPct}%</Text>
              </View>
            ))}
          </>
        )}
      </Page>
    </Document>
  )
}

function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <Paper sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>
      <Typography variant="h4" fontWeight={700} color={color ?? 'text.primary'}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  )
}

export default function VenueDashboardPage() {
  const { t } = useTranslation()
  const params = useParams()
  const router = useRouter()
  const venueID = params.id as string
  const user = useSelector((state: RootState) => state.app.user) as (User & { id?: string }) | null
  const userReady = useSelector((state: RootState) => state.app.userReady)

  const [range, setRange] = useState<DateRange>('custom')
  const [dateFrom, setDateFrom] = useState(moment().startOf('month').format('YYYY-MM-DD'))
  const [dateTo, setDateTo] = useState(moment().endOf('month').format('YYYY-MM-DD'))
  const [pdfExportMode, setPdfExportMode] = useState<PdfExportMode>('fullWithVat')

  const { venue, isLoading: venueLoading, isError: venueError } = useVenue(venueID)
  const { courts: allCourts, isLoading: courtsLoading } = useCourts()
  const { bookings, isLoading: bookingsLoading, isError: bookingsError } = useVenueBookings({ venueID })

  const courts = useMemo(() => allCourts.filter((c) => c.venueID === venueID), [allCourts, venueID])

  const initLoading = venueLoading || courtsLoading || bookingsLoading
  const error = venueError || bookingsError ? 'Failed to load dashboard data' : null

  // Auth / access guard
  useEffect(() => {
    if (!userReady || venueLoading || !venue) return
    const isSystemAdmin = (user as { role?: string })?.role === 'admin'
    const userID = (user as unknown as { id: string } | null)?.id
    const isOwner = venue.ownerUserID === userID
    const isManager = venue.managerUserIDs.includes(userID ?? '')
    if (!userID || (!isSystemAdmin && !isOwner && !isManager)) router.replace('/admin')
  }, [venue, userReady, venueLoading, router, user])

  const rangeStart = useMemo(() => moment(dateFrom).startOf('day'), [dateFrom])
  const rangeEnd = useMemo(() => moment(dateTo).endOf('day'), [dateTo])
  const isDateRangeValid = useMemo(() => !rangeEnd.isBefore(rangeStart), [rangeStart, rangeEnd])

  const { analytics, isError: analyticsError } = useVenueAnalytics({
    venueID,
    dateFrom: isDateRangeValid ? dateFrom : undefined,
    dateTo: isDateRangeValid ? dateTo : undefined,
  })

  useEffect(() => {
    if (range === 'custom') return
    if (range === 'thisMonth') {
      setDateFrom(moment().startOf('month').format('YYYY-MM-DD'))
      setDateTo(moment().endOf('month').format('YYYY-MM-DD'))
      return
    }
    if (range === 'lastMonth') {
      const lastMonth = moment().subtract(1, 'month')
      setDateFrom(lastMonth.startOf('month').format('YYYY-MM-DD'))
      setDateTo(lastMonth.endOf('month').format('YYYY-MM-DD'))
      return
    }
    if (range === 'thisYear') {
      setDateFrom(moment().startOf('year').format('YYYY-MM-DD'))
      setDateTo(moment().endOf('year').format('YYYY-MM-DD'))
    }
  }, [range])

  const activeCourts = useMemo(
    () => courts.filter((c) => c.status === 'active'),
    [courts]
  )

  const rangedBookings = useMemo(
    () => bookings.filter(
      (b) =>
        isDateRangeValid &&
        moment(b.date).isBetween(rangeStart, rangeEnd, undefined, '[]')
    ),
    [bookings, isDateRangeValid, rangeStart, rangeEnd]
  )

  const filtered = useMemo(
    () => bookings.filter(
      (b) =>
        b.status !== BookingStatus.Cancelled &&
        isDateRangeValid &&
        moment(b.date).isBetween(rangeStart, rangeEnd, undefined, '[]')
    ),
    [bookings, isDateRangeValid, rangeStart, rangeEnd]
  )

  const paidBookings = useMemo(
    () => filtered.filter((b) => b.paymentStatus === PaymentStatus.Paid),
    [filtered]
  )

  const pendingBookings = useMemo(
    () => filtered.filter((b) => b.paymentStatus === PaymentStatus.Pending),
    [filtered]
  )

  // ── Revenue ────────────────────────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => paidBookings.filter((b) => !b.resaleSourceListingID).reduce((s, b) => s + b.totalPrice, 0),
    [paidBookings]
  )

  const pendingRevenue = useMemo(
    () => pendingBookings.filter((b) => !b.resaleSourceListingID).reduce((s, b) => s + b.totalPrice, 0),
    [pendingBookings]
  )

  const currency = courts[0]?.currency ?? 'THB'

  // ── Booking counts ─────────────────────────────────────────────────────────
  const totalBookings = filtered.length
  const paidCount = paidBookings.length
  const pendingCount = pendingBookings.length

  const totalBookedMinutes = useMemo(
    () => filtered.reduce((sum, b) => sum + b.durationMinutes, 0),
    [filtered]
  )

  // ── Court utilisation ──────────────────────────────────────────────────────
  const courtUtilisation = useMemo(() => {
    if (!venue || activeCourts.length === 0) return []

    const dayCount = Math.max(moment(rangeEnd).startOf('day').diff(rangeStart, 'days') + 1, 0)
    const totalCourtMinutesPerDay = activeCourts.length * 60 // rough 1-hr baseline per court per day; replaced below
    void totalCourtMinutesPerDay

    return activeCourts.map((court) => {
      const courtBookings = filtered.filter((b) => b.courtID === court.id)
      const bookedMinutes = courtBookings.reduce((s, b) => s + b.durationMinutes, 0)

      // Capacity: average open minutes per day × days in range
      const schedule = venue.weeklySchedule
      let totalCapacityMinutes = 0
      for (let i = 0; i < dayCount; i++) {
        const d = moment(rangeStart).add(i, 'days')
        const entry = schedule?.[String(d.day())]
        if (entry) {
          totalCapacityMinutes += timeToMinutes(entry.close) - timeToMinutes(entry.open)
        }
      }
      const utilPct = totalCapacityMinutes > 0 ? Math.round((bookedMinutes / totalCapacityMinutes) * 100) : 0

      return { court, bookedMinutes, utilPct }
    }).sort((a, b) => b.utilPct - a.utilPct)
  }, [activeCourts, filtered, venue, rangeStart, rangeEnd])

  const getCapacityMinutesForRange = useCallback((start: moment.Moment, end: moment.Moment) => {
    if (!venue || activeCourts.length === 0) return 0
    const dayCount = Math.max(moment(end).startOf('day').diff(moment(start).startOf('day'), 'days') + 1, 0)
    let totalCapacity = 0
    for (let i = 0; i < dayCount; i++) {
      const d = moment(start).startOf('day').add(i, 'days')
      const entry = venue.weeklySchedule?.[String(d.day())]
      if (!entry) continue
      totalCapacity += (timeToMinutes(entry.close) - timeToMinutes(entry.open)) * activeCourts.length
    }
    return Math.max(totalCapacity, 0)
  }, [venue, activeCourts.length])

  const getSingleCourtCapacityMinutesForRange = useCallback((start: moment.Moment, end: moment.Moment) => {
    if (!venue) return 0
    const dayCount = Math.max(moment(end).startOf('day').diff(moment(start).startOf('day'), 'days') + 1, 0)
    let totalCapacity = 0
    for (let i = 0; i < dayCount; i++) {
      const d = moment(start).startOf('day').add(i, 'days')
      const entry = venue.weeklySchedule?.[String(d.day())]
      if (!entry) continue
      totalCapacity += timeToMinutes(entry.close) - timeToMinutes(entry.open)
    }
    return Math.max(totalCapacity, 0)
  }, [venue])

  const totalCapacityMinutes = useMemo(
    () => getCapacityMinutesForRange(rangeStart, rangeEnd),
    [getCapacityMinutesForRange, rangeStart, rangeEnd]
  )

  const overallUtilisationPct = useMemo(
    () => (totalCapacityMinutes > 0 ? Math.round((totalBookedMinutes / totalCapacityMinutes) * 100) : 0),
    [totalBookedMinutes, totalCapacityMinutes]
  )

  const offPeakOpenMinutes = Math.max(totalCapacityMinutes - totalBookedMinutes, 0)

  const monthKeys = useMemo(() => {
    if (!isDateRangeValid) return []
    const keys: string[] = []
    const cursor = moment(rangeStart).startOf('month')
    const end = moment(rangeEnd).endOf('month')
    while (cursor.isSameOrBefore(end)) {
      keys.push(cursor.format('YYYY-MM'))
      cursor.add(1, 'month')
    }
    return keys
  }, [rangeStart, rangeEnd, isDateRangeValid])

  const monthlyRows = useMemo<MonthlyReportRow[]>(() => {
    return monthKeys.map((monthKey) => {
      const monthStart = moment(monthKey, 'YYYY-MM').startOf('month')
      const monthEnd = moment(monthKey, 'YYYY-MM').endOf('month')
      const inRangeStart = moment.max(monthStart, rangeStart)
      const inRangeEnd = moment.min(monthEnd, rangeEnd)
      const monthBookings = rangedBookings.filter((b) => moment(b.date).isBetween(inRangeStart, inRangeEnd, undefined, '[]'))
      const monthFiltered = monthBookings.filter((b) => b.status !== BookingStatus.Cancelled)
      const monthPaid = monthFiltered.filter((b) => b.paymentStatus === PaymentStatus.Paid && !b.resaleSourceListingID)
      const paidRevenue = monthPaid.reduce((sum, b) => sum + b.totalPrice, 0)
      const discountTotal = monthBookings.reduce((sum, b) => sum + (b.discountAmount ?? 0), 0)
      const cancelledBookings = monthBookings.filter((b) => b.status === BookingStatus.Cancelled).length
      const bookedMinutes = monthFiltered.reduce((sum, b) => sum + b.durationMinutes, 0)
      const capacityMinutes = getCapacityMinutesForRange(inRangeStart, inRangeEnd)
      const utilisationPct = capacityMinutes > 0 ? Math.round((bookedMinutes / capacityMinutes) * 100) : 0
      return {
        monthKey,
        monthLabel: moment(monthKey, 'YYYY-MM').format('MMM YYYY'),
        totalBookings: monthFiltered.length,
        paidBookings: monthPaid.length,
        cancelledBookings,
        paidRevenue,
        discountTotal,
        bookedMinutes,
        utilisationPct,
      }
    })
  }, [monthKeys, rangeStart, rangeEnd, rangedBookings, getCapacityMinutesForRange])

  const accountingSummary = useMemo(() => {
    const discountTotal = rangedBookings.reduce((sum, b) => sum + (b.discountAmount ?? 0), 0)
    const cancelledCount = rangedBookings.filter((b) => b.status === BookingStatus.Cancelled).length
    const sorted = [...monthlyRows].sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    const last = sorted[sorted.length - 1]
    const prev = sorted[sorted.length - 2]
    const growthPct = prev && prev.paidRevenue > 0
      ? Math.round(((last.paidRevenue - prev.paidRevenue) / prev.paidRevenue) * 100)
      : null
    return { discountTotal, cancelledCount, growthPct }
  }, [rangedBookings, monthlyRows])

  const monthlyRowsView = analytics?.monthlyRows ?? monthlyRows
  const accountingDiscountTotal = analytics?.summary.discountTotal ?? accountingSummary.discountTotal
  const accountingCancelledCount = analytics?.summary.cancelledBookings ?? accountingSummary.cancelledCount
  const accountingGrowthPct = analytics?.summary.monthOverMonthGrowthPct ?? accountingSummary.growthPct
  const reportPaidRevenue = analytics?.summary.paidRevenue ?? totalRevenue

  const peakWeekdays = useMemo(() => {
    const byDay: Record<string, number> = {}
    filtered.forEach((b) => {
      const d = moment(b.date).format('ddd')
      byDay[d] = (byDay[d] ?? 0) + 1
    })
    return Object.entries(byDay)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [filtered])

  const weekdayWeekendSplit = useMemo(() => {
    const weekday = filtered.filter((b) => {
      const day = moment(b.date).isoWeekday()
      return day >= 1 && day <= 5
    }).length
    const weekend = filtered.length - weekday
    return { weekday, weekend }
  }, [filtered])

  const courtRanking = useMemo<CourtRankingRow[]>(() => {
    return activeCourts.map((court) => {
      const courtBookings = filtered.filter((b) => b.courtID === court.id)
      const paidRevenue = courtBookings
        .filter((b) => b.paymentStatus === PaymentStatus.Paid && !b.resaleSourceListingID)
        .reduce((sum, b) => sum + b.totalPrice, 0)
      const bookedMinutes = courtBookings.reduce((sum, b) => sum + b.durationMinutes, 0)
      const capacityMinutes = getSingleCourtCapacityMinutesForRange(rangeStart, rangeEnd)
      const utilisationPct = capacityMinutes > 0 ? Math.round((bookedMinutes / capacityMinutes) * 100) : 0
      return {
        courtID: court.id,
        courtName: court.name,
        paidRevenue,
        bookedMinutes,
        utilisationPct,
      }
    }).sort((a, b) => b.paidRevenue - a.paidRevenue)
  }, [activeCourts, filtered, rangeStart, rangeEnd, getSingleCourtCapacityMinutesForRange])

  const forecast = useMemo(() => {
    const sorted = [...monthlyRows].sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    const source = sorted.slice(-3)
    if (source.length === 0) {
      return { bookings: 0, revenue: 0, label: 'N/A' }
    }
    const bookings = Math.round(source.reduce((s, m) => s + m.totalBookings, 0) / source.length)
    const revenue = Math.round(source.reduce((s, m) => s + m.paidRevenue, 0) / source.length)
    const label = moment(sorted[sorted.length - 1]?.monthKey, 'YYYY-MM').add(1, 'month').format('MMM YYYY')
    return { bookings, revenue, label }
  }, [monthlyRows])

  const peakWeekdaysView = analytics?.weekdayDemand.slice(0, 3) ?? peakWeekdays
  const courtRankingView = analytics?.courtRanking ?? courtRanking
  const forecastView = analytics?.forecastNextMonth
    ? {
      bookings: analytics.forecastNextMonth.bookings,
      revenue: analytics.forecastNextMonth.paidRevenue,
      label: analytics.forecastNextMonth.monthLabel,
    }
    : forecast

  // ── Revenue by day (last 30 days within range) ─────────────────────────────
  const revenueByDay = useMemo(() => {
    const totalDays = Math.max(moment(rangeEnd).startOf('day').diff(rangeStart, 'days') + 1, 0)
    const days = Math.min(totalDays, 30)
    return Array.from({ length: days }, (_, i) => {
      const day = moment(rangeEnd).startOf('day').subtract(days - 1 - i, 'days')
      const dayStr = day.format('YYYY-MM-DD')
      const rev = paidBookings
        .filter((b) => moment(b.date).format('YYYY-MM-DD') === dayStr && !b.resaleSourceListingID)
        .reduce((s, b) => s + b.totalPrice, 0)
      return { dow: day.format('ddd'), label: day.format('DD MMM'), rev }
    })
  }, [paidBookings, rangeStart, rangeEnd])

  // ── Peak hours ─────────────────────────────────────────────────────────────
  const peakHours = useMemo(() => {
    const counts: Record<number, number> = {}
    filtered.forEach((b) => {
      const startH = parseInt(b.startTime.split(':')[0])
      const endH = parseInt(b.endTime.split(':')[0])
      for (let h = startH; h < endH; h++) {
        counts[h] = (counts[h] ?? 0) + 1
      }
    })
    return Object.entries(counts)
      .map(([h, count]) => ({ hour: `${h.padStart(2, '0')}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [filtered])

  const hourDemandMatrix = useMemo(() => {
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]
    const dayLabels: Record<number, string> = {
      1: t('venueReport.dayMon'),
      2: t('venueReport.dayTue'),
      3: t('venueReport.dayWed'),
      4: t('venueReport.dayThu'),
      5: t('venueReport.dayFri'),
      6: t('venueReport.daySat'),
      0: t('venueReport.daySun'),
    }
    const rows = dayOrder.map((day) => ({ day, label: dayLabels[day], values: Array.from({ length: 24 }, () => 0) }))
    const rowByDay = new Map(rows.map((r) => [r.day, r]))

    filtered.forEach((b) => {
      const day = moment(b.date).day()
      const row = rowByDay.get(day)
      if (!row) return
      const startH = parseInt(b.startTime.split(':')[0])
      const endH = parseInt(b.endTime.split(':')[0])
      for (let h = startH; h < endH; h++) {
        if (h >= 0 && h < 24) row.values[h] += 1
      }
    })

    const maxValue = Math.max(...rows.flatMap((r) => r.values), 0)
    return { rows, maxValue }
  }, [filtered, t])

  const hourlyUtilisation = useMemo(() => {
    const capacityByHour = Array.from({ length: 24 }, () => 0)
    const bookedByHour = Array.from({ length: 24 }, () => 0)
    const dayCount = Math.max(moment(rangeEnd).startOf('day').diff(rangeStart, 'days') + 1, 0)

    for (let i = 0; i < dayCount; i++) {
      const day = moment(rangeStart).startOf('day').add(i, 'days')
      const schedule = venue?.weeklySchedule?.[String(day.day())]
      if (!schedule) continue
      const openH = parseInt(schedule.open.split(':')[0])
      const closeH = parseInt(schedule.close.split(':')[0])
      for (let h = openH; h < closeH; h++) {
        if (h >= 0 && h < 24) capacityByHour[h] += activeCourts.length
      }
    }

    filtered.forEach((b) => {
      const startH = parseInt(b.startTime.split(':')[0])
      const endH = parseInt(b.endTime.split(':')[0])
      for (let h = startH; h < endH; h++) {
        if (h >= 0 && h < 24) bookedByHour[h] += 1
      }
    })

    const rows = Array.from({ length: 24 }, (_, hour) => {
      const capacity = capacityByHour[hour]
      const booked = bookedByHour[hour]
      const utilPct = capacity > 0 ? Math.round((booked / capacity) * 100) : 0
      return { hour, booked, capacity, utilPct }
    }).filter((row) => row.capacity > 0)

    const sortedByDemand = [...rows].sort((a, b) => b.utilPct - a.utilPct)
    const top = sortedByDemand[0] ?? null
    const offPeak = [...rows].sort((a, b) => a.utilPct - b.utilPct)[0] ?? null

    return { rows, top, offPeak }
  }, [filtered, rangeStart, rangeEnd, venue, activeCourts.length])

  const customerInsights = useMemo(() => {
    const customerAgg = new Map<string, { label: string; bookings: number; paidRevenue: number }>()
    const toLabel = (b: typeof filtered[number]) => {
      if (b.userID) return `${t('venueReport.customerUser')} ${b.userID.slice(0, 6)}`
      if (b.guestName) return b.guestName
      if (b.guestPhone) return b.guestPhone
      if (b.guestEmail) return b.guestEmail
      return t('venueReport.customerUnknown')
    }
    const toKey = (b: typeof filtered[number]) => {
      if (b.userID) return `user:${b.userID}`
      if (b.guestPhone) return `guest-phone:${b.guestPhone}`
      if (b.guestEmail) return `guest-email:${b.guestEmail}`
      if (b.guestName) return `guest-name:${b.guestName.trim().toLowerCase()}`
      return null
    }

    filtered.forEach((b) => {
      const key = toKey(b)
      if (!key) return
      const prev = customerAgg.get(key)
      const paidRev = b.paymentStatus === PaymentStatus.Paid && !b.resaleSourceListingID ? b.totalPrice : 0
      if (prev) {
        prev.bookings += 1
        prev.paidRevenue += paidRev
      } else {
        customerAgg.set(key, { label: toLabel(b), bookings: 1, paidRevenue: paidRev })
      }
    })

    const uniqueCustomers = customerAgg.size
    const repeatCustomers = Array.from(customerAgg.values()).filter((c) => c.bookings > 1).length
    const retentionRatePct = uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 100) : 0

    const recurringBookings = filtered.filter((b) => b.bookingType === 'recurring').length
    const singleShotBookings = filtered.filter((b) => b.bookingType === 'singleShot').length

    const bundleCourtCounts = new Map<string, number>()
    filtered.forEach((b) => {
      if (!b.bookingBundleID) return
      bundleCourtCounts.set(b.bookingBundleID, (bundleCourtCounts.get(b.bookingBundleID) ?? 0) + 1)
    })
    const groupBookings = filtered.filter((b) => (b.bookingBundleID ? (bundleCourtCounts.get(b.bookingBundleID) ?? 0) > 1 : false)).length
    const soloBookings = filtered.length - groupBookings

    const leadHours = filtered
      .map((b) => {
        if (!b.createdAt) return null
        const bookingStart = moment(`${b.date} ${b.startTime}`, 'YYYY-MM-DD HH:mm')
        const created = moment(b.createdAt)
        const diffHours = bookingStart.diff(created, 'hours', true)
        return Number.isFinite(diffHours) && diffHours >= 0 ? diffHours : null
      })
      .filter((h): h is number => h !== null)
      .sort((a, b) => a - b)

    const avgLeadHours = leadHours.length > 0 ? Math.round(leadHours.reduce((sum, h) => sum + h, 0) / leadHours.length) : 0
    const medianLeadHours = leadHours.length > 0
      ? Math.round(leadHours[Math.floor(leadHours.length / 2)])
      : 0

    const leadBuckets = {
      lt6h: leadHours.filter((h) => h < 6).length,
      h6to24: leadHours.filter((h) => h >= 6 && h < 24).length,
      d1to3: leadHours.filter((h) => h >= 24 && h < 72).length,
      gt3d: leadHours.filter((h) => h >= 72).length,
    }

    const topCustomers: TopCustomerRow[] = Array.from(customerAgg.entries())
      .map(([customerKey, value]) => ({
        customerKey,
        customerLabel: value.label,
        bookings: value.bookings,
        paidRevenue: value.paidRevenue,
      }))
      .sort((a, b) => b.bookings - a.bookings || b.paidRevenue - a.paidRevenue)

    return {
      uniqueCustomers,
      repeatCustomers,
      retentionRatePct,
      recurringBookings,
      singleShotBookings,
      soloBookings,
      groupBookings,
      avgLeadHours,
      medianLeadHours,
      leadBuckets,
      topCustomers,
    }
  }, [filtered, t])

  const promoPerformance = useMemo(() => {
    const byCode = new Map<string, { usage: number; discount: number; paidRevenue: number }>()
    paidBookings.forEach((b) => {
      if (!b.couponCode) return
      const key = b.couponCode.toUpperCase()
      const prev = byCode.get(key)
      const discount = b.discountAmount ?? 0
      if (prev) {
        prev.usage += 1
        prev.discount += discount
        prev.paidRevenue += b.totalPrice
      } else {
        byCode.set(key, { usage: 1, discount, paidRevenue: b.totalPrice })
      }
    })
    return Array.from(byCode.entries())
      .map(([code, value]) => ({ code, ...value }))
      .sort((a, b) => b.usage - a.usage || b.paidRevenue - a.paidRevenue)
  }, [paidBookings])

  const bookingChannelSplit = useMemo(() => {
    const map = {
      user: 0,
      guest: 0,
      admin: 0,
    }
    filtered.forEach((b) => {
      if (b.bookerType === 'user') map.user += 1
      else if (b.bookerType === 'guest') map.guest += 1
      else map.admin += 1
    })
    return map
  }, [filtered])

  const cancellationInsights = useMemo(() => {
    const cancelled = rangedBookings.filter((b) => b.status === BookingStatus.Cancelled)
    const cancellationRatePct = rangedBookings.length > 0 ? Math.round((cancelled.length / rangedBookings.length) * 100) : 0
    const byHour: Record<number, number> = {}
    cancelled.forEach((b) => {
      const h = parseInt(b.startTime.split(':')[0])
      byHour[h] = (byHour[h] ?? 0) + 1
    })
    const topCancelHours = Object.entries(byHour)
      .map(([h, count]) => ({ hour: `${h.padStart(2, '0')}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return {
      count: cancelled.length,
      cancellationRatePct,
      topCancelHours,
    }
  }, [rangedBookings])

  const courtPopularity = useMemo(() => {
    return activeCourts
      .map((court) => {
        const count = filtered.filter((b) => b.courtID === court.id).length
        return { courtID: court.id, courtName: court.name, count }
      })
      .sort((a, b) => b.count - a.count)
  }, [activeCourts, filtered])

  // ── Booker type split ──────────────────────────────────────────────────────
  const guestCount = filtered.filter((b) => b.bookerType === 'guest').length
  const userCount = filtered.filter((b) => b.bookerType === 'user').length

  // ── Avg booking duration ───────────────────────────────────────────────────
  const avgDuration = filtered.length > 0
    ? Math.round(filtered.reduce((s, b) => s + b.durationMinutes, 0) / filtered.length)
    : 0

  if (initLoading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    )
  }

  const fmtPrice = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
  const maxBarRev = Math.max(...revenueByDay.map((d) => d.rev), 1)
  const periodText = `${moment(rangeStart).format('DD MMM YYYY')} - ${moment(rangeEnd).format('DD MMM YYYY')}`

  const exportPDF = async() => {
    const exportConfig: Record<PdfExportMode, { exportMode: ExportMode; pdfVatMode: PdfVatMode; fileLabel: string }> = {
      fullWithVat: { exportMode: 'full', pdfVatMode: 'withVat', fileLabel: 'full-with-vat' },
      fullWithoutVat: { exportMode: 'full', pdfVatMode: 'withoutVat', fileLabel: 'full-without-vat' },
      accountingWithVat: { exportMode: 'accounting', pdfVatMode: 'withVat', fileLabel: 'accounting-with-vat' },
      accountingWithoutVat: { exportMode: 'accounting', pdfVatMode: 'withoutVat', fileLabel: 'accounting-without-vat' },
    }
    const selectedExportConfig = exportConfig[pdfExportMode]

    const toTwo = (value: number) => Math.round(value * 100) / 100
    const withVat = selectedExportConfig.pdfVatMode === 'withVat'
    const taxRows: TaxWorksheetRow[] = paidBookings
      .filter((b) => !b.resaleSourceListingID)
      .sort((a, b) => {
        const av = moment(`${a.date} ${a.startTime}`, 'YYYY-MM-DD HH:mm').valueOf()
        const bv = moment(`${b.date} ${b.startTime}`, 'YYYY-MM-DD HH:mm').valueOf()
        return av - bv
      })
      .map((b) => {
        const grossAmount = toTwo(b.totalPrice)
        const netAmount = withVat ? toTwo(grossAmount / 1.07) : grossAmount
        const vatAmount = withVat ? toTwo(grossAmount - netAmount) : 0
        const docNo = b.bookingRef ?? `BK-${b.id.slice(-8).toUpperCase()}`
        const customer = b.bookerType === 'user'
          ? `${t('venueReport.customerUser')} ${b.userID?.slice(0, 6) ?? ''}`.trim()
          : b.guestName || b.guestPhone || b.guestEmail || t('venueReport.customerUnknown')
        return {
          docNo,
          serviceDate: moment(b.date).format('YYYY-MM-DD'),
          customer,
          grossAmount,
          netAmount,
          vatAmount,
        }
      })

    const taxTotals = taxRows.reduce((sum, row) => {
      sum.gross += row.grossAmount
      sum.net += row.netAmount
      sum.vat += row.vatAmount
      return sum
    }, { gross: 0, net: 0, vat: 0 })

    const reportPdfText: ReportPdfText = {
      title: t('venueReport.pdfTitle'),
      period: t('venueReport.period'),
      accountingSummary: t('venueReport.pdfAccountingSummary'),
      paidRevenue: t('venueReport.paidRevenue'),
      discountTotal: t('venueReport.discountTotal'),
      cancelledBookings: t('venueReport.cancelledBookings'),
      monthOverMonthGrowth: t('venueReport.pdfMonthOverMonthGrowth'),
      monthlyBreakdown: t('venueReport.pdfMonthlyBreakdown'),
      month: t('venueReport.month'),
      bookings: t('venueReport.bookingsCol'),
      discounts: t('venueReport.pdfDiscounts'),
      utilisation: t('venueReport.utilisationCol'),
      strategicHighlights: t('venueReport.pdfStrategicHighlights'),
      topDemandDay: t('venueReport.topDemandDay'),
      topDemandHour: t('venueReport.topHour'),
      forecast: t('venueReport.pdfForecast'),
      topCourtsByRevenue: t('venueReport.pdfTopCourtsByRevenue'),
      taxWorksheetTitle: t('venueReport.taxWorksheetTitle'),
      generatedAt: t('venueReport.generatedAt'),
      sellerName: t('venueReport.sellerName'),
      sellerAddress: t('venueReport.sellerAddress'),
      sellerTaxId: t('venueReport.sellerTaxId'),
      sellerTaxIdUnavailable: t('venueReport.sellerTaxIdUnavailable'),
      vatRate: t('venueReport.vatRate'),
      netAmountExVat: t('venueReport.netAmountExVat'),
      vatAmount: t('venueReport.vatAmount'),
      grossAmountIncVat: t('venueReport.grossAmountIncVat'),
      amountNoVat: t('venueReport.amountNoVat'),
      vatNotApplied: t('venueReport.vatNotApplied'),
      paidTransactions: t('venueReport.paidTransactions'),
      docNo: t('venueReport.docNo'),
      serviceDate: t('venueReport.serviceDate'),
      customer: t('venueReport.customer'),
      gross: t('venueReport.gross'),
      net: t('venueReport.net'),
      vat: t('venueReport.vat'),
    }

    const doc = (
      <ReportPdfDocument
        venueName={venue?.name?.en || venue?.name?.th || 'Venue'}
        venueAddress={venue?.address || '-'}
        periodText={periodText}
        currency={currency}
        paidRevenue={reportPaidRevenue}
        discountTotal={accountingDiscountTotal}
        cancelledCount={accountingCancelledCount}
        growthPct={accountingGrowthPct}
        monthlyRows={monthlyRowsView}
        exportMode={selectedExportConfig.exportMode}
        topDemandDay={peakWeekdaysView[0] ? `${peakWeekdaysView[0].day} (${peakWeekdaysView[0].count})` : 'N/A'}
        topDemandHour={peakHours[0] ? `${peakHours[0].hour} (${peakHours[0].count})` : 'N/A'}
        forecastLabel={forecastView.label}
        forecastRevenue={forecastView.revenue}
        forecastBookings={forecastView.bookings}
        courtRanking={courtRankingView}
        taxRows={taxRows}
        netAmountExVat={toTwo(taxTotals.net)}
        vatAmount={toTwo(taxTotals.vat)}
        grossAmountIncVat={toTwo(taxTotals.gross)}
        pdfVatMode={selectedExportConfig.pdfVatMode}
        generatedAtText={moment().format('YYYY-MM-DD HH:mm')}
        text={reportPdfText}
      />
    )
    const blob = await pdf(doc).toBlob()
    saveAs(blob, `venue-${selectedExportConfig.fileLabel}-report-${venueID}-${moment().format('YYYYMMDD-HHmm')}.pdf`)
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ pt: 2, pb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => router.push('/admin')} sx={{ mr: 1 }}>
            {t('venueReport.allVenues')}
          </Button>
        </Box>

        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          {venue?.name?.en || venue?.name?.th}
        </Typography>

        <Tabs
          value="dashboard"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          onChange={(_, v) => {
            if (v === 'timetable') router.push(`/venues/${venueID}/admin/timetable`)
            if (v === 'bookings') router.push(`/venues/${venueID}/admin/bookings`)
            if (v === 'settings') router.push(`/venues/${venueID}/admin/settings`)
          }}
        >
          <Tab label={t('venueReport.tabDashboard')} value="dashboard" />
          <Tab label={t('venueReport.tabTimetable')} value="timetable" />
          <Tab label={t('venueReport.tabPayments')} value="bookings" />
          <Tab label={t('venueReport.tabSettings')} value="settings" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{t('venueReport.loadDashboardFailed')}</Alert>}
        {analyticsError && <Alert severity="warning" sx={{ mb: 2 }}>{t('venueReport.analyticsFallback')}</Alert>}

        {/* Date range selectors */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, mb: 3 }}
        >
          <ToggleButtonGroup
            value={range}
            exclusive
            onChange={(_, v) => { if (v) setRange(v) }}
            size="small"
          >
            <ToggleButton value="thisMonth">{t('venueReport.rangeThisMonth')}</ToggleButton>
            <ToggleButton value="lastMonth">{t('venueReport.rangeLastMonth')}</ToggleButton>
            <ToggleButton value="thisYear">{t('venueReport.rangeThisYear')}</ToggleButton>
          </ToggleButtonGroup>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{
              alignItems: { xs: 'stretch', sm: 'center' },
              width: { xs: '100%', md: 'auto' },
              flexWrap: 'wrap',
            }}
          >
            <TextField
              select
              size="small"
              label={t('venueReport.pdfExportMode')}
              value={pdfExportMode}
              onChange={(e) => setPdfExportMode(e.target.value as PdfExportMode)}
              fullWidth
              sx={{ minWidth: { sm: 240 }, width: { xs: '100%', sm: 'auto' }, order: { xs: 3, sm: 1 }, mt: { xs: 1.5, sm: 0 } }}
            >
              <MenuItem value="fullWithVat">{t('venueReport.pdfModeFullWithVat')}</MenuItem>
              <MenuItem value="fullWithoutVat">{t('venueReport.pdfModeFullWithoutVat')}</MenuItem>
              <MenuItem value="accountingWithVat">{t('venueReport.pdfModeAccountingWithVat')}</MenuItem>
              <MenuItem value="accountingWithoutVat">{t('venueReport.pdfModeAccountingWithoutVat')}</MenuItem>
            </TextField>
            <Button
              variant="outlined"
              onClick={exportPDF}
              sx={{ width: { xs: '100%', sm: 'auto' }, order: { xs: 4, sm: 2 } }}
            >
              {t('venueReport.exportPDF')}
            </Button>
            <TextField
              type="date"
              size="small"
              label={t('venueReport.from')}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setRange('custom')
              }}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{ minWidth: { sm: 160 }, width: { xs: '100%', sm: 'auto' }, order: { xs: 1, sm: 3 } }}
            />
            <TextField
              type="date"
              size="small"
              label={t('venueReport.to')}
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setRange('custom')
              }}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{ minWidth: { sm: 160 }, width: { xs: '100%', sm: 'auto' }, order: { xs: 2, sm: 4 }, mb: { xs: 1.5, sm: 0 } }}
            />
          </Stack>
        </Stack>

        {!isDateRangeValid && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t('venueReport.invalidDateRange')}
          </Alert>
        )}

        {/* ── KPI row ────────────────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <StatCard
              label={t('venueReport.totalRevenue')}
              value={`${fmtPrice(totalRevenue)} ${currency}`}
              sub={t('venueReport.paidBookings')}
              color="success.main"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label={t('venueReport.pendingRevenue')}
              value={`${fmtPrice(pendingRevenue)} ${currency}`}
              sub={t('venueReport.awaitingApproval')}
              color="warning.main"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label={t('venueReport.totalBookings')}
              value={totalBookings}
              sub={t('venueReport.paidPendingSplit', { paid: paidCount, pending: pendingCount })}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label={t('venueReport.avgDuration')}
              value={`${avgDuration} min`}
              sub={t('venueReport.perBooking')}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <StatCard
              label={t('venueReport.overallUtilisationRate')}
              value={`${overallUtilisationPct}%`}
              sub={`${Math.round(totalBookedMinutes / 60)}h / ${Math.round(totalCapacityMinutes / 60)}h`}
              color={overallUtilisationPct >= 70 ? 'success.main' : overallUtilisationPct >= 40 ? 'warning.main' : 'error.main'}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label={t('venueReport.offPeakOpenHours')}
              value={`${Math.round(offPeakOpenMinutes / 60)}h`}
              sub={t('venueReport.sellableSlots')}
              color="info.main"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label={t('venueReport.repeatCustomerRate')}
              value={`${customerInsights.retentionRatePct}%`}
              sub={t('venueReport.repeatCustomerSub', { repeat: customerInsights.repeatCustomers, total: customerInsights.uniqueCustomers })}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard
              label={t('venueReport.cancellationRate')}
              value={`${cancellationInsights.cancellationRatePct}%`}
              sub={t('venueReport.cancelledCountSub', { count: cancellationInsights.count })}
              color={cancellationInsights.cancellationRatePct >= 20 ? 'error.main' : 'text.primary'}
            />
          </Grid>
        </Grid>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.hourlyHeatmapTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('venueReport.hourlyHeatmapDesc')}
          </Typography>

          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 860 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '96px repeat(24, minmax(26px, 1fr))', gap: 0.5, mb: 0.5 }}>
                <Box />
                {Array.from({ length: 24 }, (_, h) => (
                  <Typography key={`h-${h}`} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: 10 }}>
                    {`${String(h).padStart(2, '0')}`}
                  </Typography>
                ))}
              </Box>

              {hourDemandMatrix.rows.map((row) => (
                <Box key={row.day} sx={{ display: 'grid', gridTemplateColumns: '96px repeat(24, minmax(26px, 1fr))', gap: 0.5, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ pr: 1 }}>{row.label}</Typography>
                  {row.values.map((value, idx) => {
                    const ratio = hourDemandMatrix.maxValue > 0 ? value / hourDemandMatrix.maxValue : 0
                    return (
                      <Box
                        key={`${row.day}-${idx}`}
                        title={`${row.label} ${String(idx).padStart(2, '0')}:00 · ${value} ${t('venueReport.slots')}`}
                        sx={{
                          height: 22,
                          borderRadius: 0.75,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: value === 0 ? 'grey.100' : alpha('#1e88e5', 0.15 + ratio * 0.75),
                        }}
                      />
                    )
                  })}
                </Box>
              ))}
            </Box>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              color="success"
              label={hourlyUtilisation.top
                ? t('venueReport.peakHourChip', { hour: `${String(hourlyUtilisation.top.hour).padStart(2, '0')}:00`, util: hourlyUtilisation.top.utilPct })
                : t('venueReport.noDataInRange')}
            />
            <Chip
              size="small"
              color="warning"
              label={hourlyUtilisation.offPeak
                ? t('venueReport.offPeakHourChip', { hour: `${String(hourlyUtilisation.offPeak.hour).padStart(2, '0')}:00`, util: hourlyUtilisation.offPeak.utilPct })
                : t('venueReport.noDataInRange')}
            />
            <Chip
              size="small"
              label={t('venueReport.weekdayWeekendSplit', { weekday: weekdayWeekendSplit.weekday, weekend: weekdayWeekendSplit.weekend })}
            />
          </Stack>
        </Paper>

        {/* ── Revenue bar chart ──────────────────────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            {t('venueReport.dailyRevenueLastDays', { days: Math.min(Math.max(moment(rangeEnd).startOf('day').diff(rangeStart, 'days') + 1, 0), 30) })}
          </Typography>
          {revenueByDay.every((d) => d.rev === 0) ? (
            <Typography variant="body2" color="text.secondary">{t('venueReport.noPaidRevenueInPeriod')}</Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 160, overflowX: 'auto' }}>
              {revenueByDay.map((d) => (
                <Box key={d.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 0 32px', minWidth: 32 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, whiteSpace: 'nowrap', fontSize: 10 }}>
                    {d.rev > 0 ? fmtPrice(d.rev) : ''}
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      bgcolor: 'primary.main',
                      borderRadius: '4px 4px 0 0',
                      height: `${Math.max((d.rev / maxBarRev) * 120, d.rev > 0 ? 4 : 0)}px`,
                      transition: 'height 0.3s',
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontSize: 9, whiteSpace: 'nowrap', lineHeight: 1 }}>{d.dow}</Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, whiteSpace: 'nowrap', lineHeight: 1.1 }}>{d.label}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>{t('venueReport.customerInsightsTitle')}</Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t('venueReport.uniqueCustomers')}
                value={customerInsights.uniqueCustomers}
                sub={t('venueReport.inSelectedRange')}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t('venueReport.repeatCustomers')}
                value={customerInsights.repeatCustomers}
                sub={`${customerInsights.retentionRatePct}%`}
                color="primary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t('venueReport.avgLeadTime')}
                value={`${customerInsights.avgLeadHours}h`}
                sub={t('venueReport.medianLeadTime', { hours: customerInsights.medianLeadHours })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t('venueReport.customerRecurringBookings')}
                value={customerInsights.recurringBookings}
                sub={t('venueReport.customerSingleBookings', { count: customerInsights.singleShotBookings })}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.customerSegments')}</Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">{t('venueReport.segmentRecurringVsSingle', { recurring: customerInsights.recurringBookings, single: customerInsights.singleShotBookings })}</Typography>
                  <Typography variant="body2">{t('venueReport.segmentSoloVsGroup', { solo: customerInsights.soloBookings, group: customerInsights.groupBookings })}</Typography>
                  <Typography variant="body2">{t('venueReport.segmentMemberVsGuest', { user: userCount, guest: guestCount })}</Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.leadTimeDistribution')}</Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">{t('venueReport.leadBucketLt6h', { count: customerInsights.leadBuckets.lt6h })}</Typography>
                  <Typography variant="body2">{t('venueReport.leadBucket6to24h', { count: customerInsights.leadBuckets.h6to24 })}</Typography>
                  <Typography variant="body2">{t('venueReport.leadBucket1to3d', { count: customerInsights.leadBuckets.d1to3 })}</Typography>
                  <Typography variant="body2">{t('venueReport.leadBucketGt3d', { count: customerInsights.leadBuckets.gt3d })}</Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.topCustomers')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('venueReport.customer')}</TableCell>
                  <TableCell align="right">{t('venueReport.bookingsCol')}</TableCell>
                  <TableCell align="right">{t('venueReport.paidRevenueCol')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerInsights.topCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">{t('venueReport.noDataInRange')}</TableCell>
                  </TableRow>
                ) : (
                  customerInsights.topCustomers.slice(0, 5).map((row) => (
                    <TableRow key={row.customerKey}>
                      <TableCell>{row.customerLabel}</TableCell>
                      <TableCell align="right">{row.bookings}</TableCell>
                      <TableCell align="right">{fmtPrice(row.paidRevenue)} {currency}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>{t('venueReport.marketingPerformanceTitle')}</Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <StatCard
                label={t('venueReport.aov')}
                value={paidCount > 0 ? `${fmtPrice(totalRevenue / paidCount)} ${currency}` : '—'}
                sub={t('venueReport.paidBookingsOnly')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                label={t('venueReport.couponUsageCount')}
                value={promoPerformance.reduce((sum, p) => sum + p.usage, 0)}
                sub={t('venueReport.couponImpact')}
                color="warning.main"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                label={t('venueReport.discountTotal')}
                value={`${fmtPrice(accountingDiscountTotal)} ${currency}`}
                sub={t('venueReport.withinSelectedPeriod')}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.bookingChannelsTitle')}</Typography>
                <Stack spacing={0.75}>
                  <Typography variant="body2">{t('venueReport.channelUser', { count: bookingChannelSplit.user })}</Typography>
                  <Typography variant="body2">{t('venueReport.channelGuest', { count: bookingChannelSplit.guest })}</Typography>
                  <Typography variant="body2">{t('venueReport.channelAdmin', { count: bookingChannelSplit.admin })}</Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.revenueBreakdownTitle')}</Typography>
                <Stack spacing={0.75}>
                  <Typography variant="body2">{t('venueReport.revenueCourtsOnly', { amount: fmtPrice(totalRevenue), currency })}</Typography>
                  <Typography variant="caption" color="text.secondary">{t('venueReport.revenueBreakdownNote')}</Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.promoPerformanceTitle')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('venueReport.promoCode')}</TableCell>
                  <TableCell align="right">{t('venueReport.usedCount')}</TableCell>
                  <TableCell align="right">{t('venueReport.discountTotalCol')}</TableCell>
                  <TableCell align="right">{t('venueReport.paidRevenueCol')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {promoPerformance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">{t('venueReport.noPromoUsage')}</TableCell>
                  </TableRow>
                ) : (
                  promoPerformance.slice(0, 10).map((row) => (
                    <TableRow key={row.code}>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.code}</TableCell>
                      <TableCell align="right">{row.usage}</TableCell>
                      <TableCell align="right">{fmtPrice(row.discount)} {currency}</TableCell>
                      <TableCell align="right">{fmtPrice(row.paidRevenue)} {currency}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>{t('venueReport.operationsTitle')}</Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.cancellationByHour')}</Typography>
                {cancellationInsights.topCancelHours.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">{t('venueReport.noCancellationData')}</Typography>
                ) : (
                  <Stack spacing={1}>
                    {cancellationInsights.topCancelHours.map((row) => (
                      <Typography key={row.hour} variant="body2">{row.hour} · {row.count} {t('venueReport.slots')}</Typography>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.cancellationReasons')}</Typography>
                <Typography variant="body2" color="text.secondary">{t('venueReport.cancellationReasonUnavailable')}</Typography>
                <Typography variant="caption" color="text.secondary">{t('venueReport.cancellationReasonUnavailableHint')}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.courtPopularityTitle')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('venueReport.court')}</TableCell>
                  <TableCell align="right">{t('venueReport.bookingsCol')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courtPopularity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center">{t('venueReport.noActiveCourts')}</TableCell>
                  </TableRow>
                ) : (
                  courtPopularity.map((row) => (
                    <TableRow key={row.courtID}>
                      <TableCell>{row.courtName}</TableCell>
                      <TableCell align="right">{row.count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* ── Court utilisation ──────────────────────────────────────── */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Court Utilisation</Typography>
              {courtUtilisation.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t('venueReport.noCourtsFound')}</Typography>
              ) : (
                courtUtilisation.map(({ court, bookedMinutes, utilPct }) => (
                  <Box key={court.id} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={500}>{court.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('venueReport.utilHoursBooked', { util: utilPct, hours: Math.round(bookedMinutes / 60) })}
                      </Typography>
                    </Box>
                    <Box sx={{ height: 8, borderRadius: 1, bgcolor: 'grey.200', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${Math.min(utilPct, 100)}%`,
                          bgcolor: utilPct >= 70 ? 'success.main' : utilPct >= 40 ? 'primary.main' : 'warning.main',
                          borderRadius: 1,
                          transition: 'width 0.3s',
                        }}
                      />
                    </Box>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>

          {/* ── Peak hours ─────────────────────────────────────────────── */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>{t('venueReport.topPeakHours')}</Typography>
              {peakHours.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t('venueReport.noBookingDataInPeriod')}</Typography>
              ) : (
                peakHours.map(({ hour, count }, i) => (
                  <Box key={hour} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <Typography variant="body2" sx={{ width: 52, fontWeight: 500 }}>#{i + 1} {hour}</Typography>
                    <Box sx={{ flex: 1, height: 8, borderRadius: 1, bgcolor: 'grey.200', overflow: 'hidden' }}>
                      <Box
                        sx={{
                          height: '100%',
                          width: `${Math.round((count / (peakHours[0]?.count ?? 1)) * 100)}%`,
                          bgcolor: 'secondary.main',
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ width: 48, textAlign: 'right' }}>
                      {t('venueReport.slotsLabel', { count })}
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* ── Booker type & extra stats ──────────────────────────────────── */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard label={t('venueReport.registeredUsers')} value={userCount} sub={t('venueReport.percentOfBookings', { percent: totalBookings > 0 ? Math.round((userCount / totalBookings) * 100) : 0 })} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard label={t('venueReport.guestBookings')} value={guestCount} sub={t('venueReport.percentOfBookings', { percent: totalBookings > 0 ? Math.round((guestCount / totalBookings) * 100) : 0 })} />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard label={t('venueReport.activeCourts')} value={courts.filter((c) => c.status === 'active').length} sub={t('venueReport.ofTotalCourts', { total: courts.length })} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.monthlyTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('venueReport.period')}: {periodText}
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label={t('venueReport.paidRevenue')} value={`${fmtPrice(reportPaidRevenue)} ${currency}`} sub={t('venueReport.accountingBasis')} color="success.main" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label={t('venueReport.discountTotal')} value={`${fmtPrice(accountingDiscountTotal)} ${currency}`} sub={t('venueReport.couponImpact')} color="warning.main" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label={t('venueReport.cancelledBookings')} value={accountingCancelledCount} sub={t('venueReport.withinSelectedPeriod')} color="error.main" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t('venueReport.momGrowth')}
                value={accountingGrowthPct === null ? 'N/A' : `${accountingGrowthPct > 0 ? '+' : ''}${accountingGrowthPct}%`}
                sub={t('venueReport.latestVsPrevious')}
                color={accountingGrowthPct !== null && accountingGrowthPct >= 0 ? 'success.main' : 'error.main'}
              />
            </Grid>
          </Grid>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('venueReport.month')}</TableCell>
                  <TableCell align="right">{t('venueReport.bookingsCol')}</TableCell>
                  <TableCell align="right">{t('venueReport.paidBookingsCol')}</TableCell>
                  <TableCell align="right">{t('venueReport.cancelledCol')}</TableCell>
                  <TableCell align="right">{t('venueReport.paidRevenueCol')}</TableCell>
                  <TableCell align="right">{t('venueReport.discountTotalCol')}</TableCell>
                  <TableCell align="right">{t('venueReport.bookedHoursCol')}</TableCell>
                  <TableCell align="right">{t('venueReport.utilisationCol')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {monthlyRowsView.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">{t('venueReport.noDataInRange')}</TableCell>
                  </TableRow>
                ) : (
                  monthlyRowsView.map((row) => (
                    <TableRow key={row.monthKey}>
                      <TableCell>{row.monthLabel}</TableCell>
                      <TableCell align="right">{row.totalBookings}</TableCell>
                      <TableCell align="right">{row.paidBookings}</TableCell>
                      <TableCell align="right">{row.cancelledBookings}</TableCell>
                      <TableCell align="right">{fmtPrice(row.paidRevenue)} {currency}</TableCell>
                      <TableCell align="right">{fmtPrice(row.discountTotal)} {currency}</TableCell>
                      <TableCell align="right">{Math.round(row.bookedMinutes / 60)}</TableCell>
                      <TableCell align="right">{row.utilisationPct}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>{t('venueReport.strategicTitle')}</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <StatCard
                label={t('venueReport.topDemandDay')}
                value={peakWeekdaysView[0] ? `${peakWeekdaysView[0].day} (${peakWeekdaysView[0].count})` : 'N/A'}
                sub={t('venueReport.byBookingVolume')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                label={t('venueReport.topHour')}
                value={peakHours[0] ? `${peakHours[0].hour} (${peakHours[0].count})` : 'N/A'}
                sub={t('venueReport.mostBookedSlot')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatCard
                label={t('venueReport.forecastNextMonth')}
                value={`${forecastView.bookings} ${t('venueReport.bookings')}`}
                sub={`${forecastView.label} · ${fmtPrice(forecastView.revenue)} ${currency} ${t('venueReport.estimated')}`}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{t('venueReport.courtRankingByRevenue')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('venueReport.court')}</TableCell>
                  <TableCell align="right">{t('venueReport.paidRevenueCol')}</TableCell>
                  <TableCell align="right">{t('venueReport.bookedHoursCol')}</TableCell>
                  <TableCell align="right">{t('venueReport.utilisationCol')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courtRankingView.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">{t('venueReport.noActiveCourts')}</TableCell>
                  </TableRow>
                ) : (
                  courtRankingView.map((row) => (
                    <TableRow key={row.courtID}>
                      <TableCell>{row.courtName}</TableCell>
                      <TableCell align="right">{fmtPrice(row.paidRevenue)} {currency}</TableCell>
                      <TableCell align="right">{Math.round(row.bookedMinutes / 60)}</TableCell>
                      <TableCell align="right">{row.utilisationPct}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

      </Container>
    </Layout>
  )
}
