'use client'

import TournamentLayout from '@/app/components/Layout/TournamentLayout'
import { setActiveMenu } from '@/app/libs/redux/slices/appSlice'
import { useAppDispatch } from '@/app/providers'
import { TournamentMenu } from '@/type'
import { useMatchesTournament, useTournament } from '@/app/libs/data'
import { Box, Card, CardContent, CircularProgress, Divider, Grid, Stack, TextField, Typography } from '@mui/material'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import MenuDrawer from '../MenuDrawer'

const toSafeNumber = (value: string): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

const toMoney = (value: number): string => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const OrganizerStatisticsPage = () => {
  const params = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { tournament } = useTournament(params.id)
  const { matches, isLoading: isMatchLoading } = useMatchesTournament(params.id)

  const [registrationIncomeInput, setRegistrationIncomeInput] = useState('0')
  const [courtFeesInput, setCourtFeesInput] = useState('0')
  const [shuttlecockBuyingPriceInput, setShuttlecockBuyingPriceInput] = useState('0')
  const [shuttlecockSellingPriceInput, setShuttlecockSellingPriceInput] = useState('0')
  const [staffExpenseInput, setStaffExpenseInput] = useState('0')
  const [prizeExpenseInput, setPrizeExpenseInput] = useState('0')
  const [otherExpenseInput, setOtherExpenseInput] = useState('0')

  useEffect(() => {
    dispatch(setActiveMenu(TournamentMenu.Organize))
  }, [dispatch])

  useEffect(() => {
    if (tournament?.shuttlecockFee && tournament.shuttlecockFee > 0) {
      setShuttlecockSellingPriceInput(String(tournament.shuttlecockFee))
    }
  }, [tournament?.shuttlecockFee])

  const totalShuttlecockUsed = useMemo(() => {
    return (matches ?? [])
      .filter((match) => !match.skip)
      .reduce((sum, match) => sum + (match.shuttlecockUsed || 0), 0)
  }, [matches])

  const totalMatchesCount = useMemo(() => {
    return (matches ?? []).filter((match) => !match.skip).length
  }, [matches])

  const registrationIncome = toSafeNumber(registrationIncomeInput)
  const courtFees = toSafeNumber(courtFeesInput)
  const shuttlecockBuyingPrice = toSafeNumber(shuttlecockBuyingPriceInput)
  const shuttlecockSellingPrice = toSafeNumber(shuttlecockSellingPriceInput)
  const staffExpense = toSafeNumber(staffExpenseInput)
  const prizeExpense = toSafeNumber(prizeExpenseInput)
  const otherExpense = toSafeNumber(otherExpenseInput)

  const shuttlecockCost = totalShuttlecockUsed * shuttlecockBuyingPrice
  const shuttlecockRevenue = totalShuttlecockUsed * shuttlecockSellingPrice
  const shuttlecockMarginProfit = shuttlecockRevenue - shuttlecockCost
  const baseExpense = courtFees + staffExpense + prizeExpense + otherExpense
  const totalExpense = baseExpense + shuttlecockCost
  const totalIncome = registrationIncome + shuttlecockRevenue
  const finalProfit = totalIncome - totalExpense

  const currency = tournament?.events?.[0]?.fee?.currency || 'THB'

  return (
    <TournamentLayout tournament={tournament}>
      {!tournament || isMatchLoading
        ? <CircularProgress/>
        : <Box sx={{ display: 'flex' }}>
          <MenuDrawer tournamentID={tournament.id}/>
          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={700}>สถิติการแข่งขันและสรุปการเงิน</Typography>
              <Typography variant="body2" color="text.secondary">
                หน้านี้คำนวณผลแบบฝั่ง Frontend เท่านั้น ยังไม่มีการบันทึกลงฐานข้อมูล
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">จำนวนแมตช์ทั้งหมด</Typography>
                      <Typography variant="h4" fontWeight={700}>{totalMatchesCount}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">ลูกแบดที่ใช้ทั้งหมด</Typography>
                      <Typography variant="h4" fontWeight={700}>{totalShuttlecockUsed}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">กำไรจากมาร์จิ้นลูกแบด</Typography>
                      <Typography variant="h4" fontWeight={700} color={shuttlecockMarginProfit >= 0 ? 'success.main' : 'error.main'}>
                        {toMoney(shuttlecockMarginProfit)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{currency}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>กรอกข้อมูลการเงิน</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`รายรับรวม (${currency})`}
                        type="number"
                        value={registrationIncomeInput}
                        onChange={(e) => setRegistrationIncomeInput(e.target.value)}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`ค่าคอร์ด (${currency})`}
                        type="number"
                        value={courtFeesInput}
                        onChange={(e) => setCourtFeesInput(e.target.value)}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`ราคาซื้อลูกแบดต่อหน่วย (${currency})`}
                        type="number"
                        value={shuttlecockBuyingPriceInput}
                        onChange={(e) => setShuttlecockBuyingPriceInput(e.target.value)}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`ราคาขายลูกแบดต่อหน่วย (${currency})`}
                        type="number"
                        value={shuttlecockSellingPriceInput}
                        onChange={(e) => setShuttlecockSellingPriceInput(e.target.value)}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`ค่า Staff (${currency})`}
                        type="number"
                        value={staffExpenseInput}
                        onChange={(e) => setStaffExpenseInput(e.target.value)}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`ค่า Prize (${currency})`}
                        type="number"
                        value={prizeExpenseInput}
                        onChange={(e) => setPrizeExpenseInput(e.target.value)}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label={`ค่าใช้จ่ายอื่น ๆ (${currency})`}
                        type="number"
                        value={otherExpenseInput}
                        onChange={(e) => setOtherExpenseInput(e.target.value)}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700}>สรุป</Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1}>
                    <Typography>รายรับค่าสมัคร: {toMoney(registrationIncome)} {currency}</Typography>
                    <Typography>รายรับลูกแบด: {toMoney(shuttlecockRevenue)} {currency}</Typography>
                    <Typography>รายรับรวม: {toMoney(totalIncome)} {currency}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography>ค่าคอร์ด: {toMoney(courtFees)} {currency}</Typography>
                    <Typography>ต้นทุนลูกแบด: {toMoney(shuttlecockCost)} {currency}</Typography>
                    <Typography>ค่า Staff: {toMoney(staffExpense)} {currency}</Typography>
                    <Typography>ค่า Prize: {toMoney(prizeExpense)} {currency}</Typography>
                    <Typography>ค่าใช้จ่ายอื่น ๆ: {toMoney(otherExpense)} {currency}</Typography>
                    <Typography fontWeight={700} color={shuttlecockMarginProfit >= 0 ? 'success.main' : 'error.main'}>
                      กำไรจากมาร์จิ้นลูกแบด: {toMoney(shuttlecockMarginProfit)} {currency}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography fontWeight={700}>ค่าใช้จ่ายรวม: {toMoney(totalExpense)} {currency}</Typography>
                    <Typography fontWeight={800} color={finalProfit >= 0 ? 'success.main' : 'error.main'}>
                      กำไรสุทธิ: {toMoney(finalProfit)} {currency}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Box>
        </Box>}
    </TournamentLayout>
  )
}

export default OrganizerStatisticsPage