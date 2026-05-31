"use client"

import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Box, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemText, Toolbar, Tooltip } from '@mui/material'
import { useState } from 'react'

const expandedDrawerWidth = 200
const collapsedDrawerWidth = 72

const organizerMenu = [
  {
    title: 'รายการแข่ง',
    action: '/event-management'
  },
  {
    title: 'รายชื่อ',
    action: '/participants'
  },
  {
    title: 'จับสาย',
    action: '/draw'
  },
  {
    title: 'จัดตารางแข่ง',
    action: '/match-scheduling'
  },
]

const PersonelMenu = [
  {
    title: 'ผู้จัดการ',
    action: '/managers'
  },
  {
    title: 'กรรมการ',
    action: '/umpires'
  }
]


const duringTournamentMenu = [
  {
    title: 'ดำเนินการแข่งขัน',
    action: '/run-match'
  },
  {
    title: 'สรุปทีมเข้ารอบ',
    action: '/round-up'
  },
  {
    title: 'สรุปผลการแข่งขัน',
    action: '/result'
  },
]

const MenuDrawer = ({ tournamentID }: {tournamentID: string}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const drawerWidth = isCollapsed ? collapsedDrawerWidth : expandedDrawerWidth

  const renderMenuSection = (menus: { title: string; action: string }[]) => (
    <List>
      {menus.map((menu) => (
        <ListItem key={menu.title} disablePadding>
          <Tooltip title={isCollapsed ? menu.title : ''} placement="right">
            <ListItemButton
              href={`/tournaments/${tournamentID}/organizer/${menu.action}`}
              sx={{
                minHeight: 48,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                px: 2,
              }}>
              <ListItemText
                primary={isCollapsed ? menu.title.slice(0, 1) : menu.title}
                sx={{
                  textAlign: isCollapsed ? 'center' : 'left',
                  '& .MuiTypography-root': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: isCollapsed ? '0.875rem' : '1rem',
                  },
                }} />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      ))}
    </List>
  )

  return (<Drawer
    sx={{
      width: drawerWidth,
      flexShrink: 0,
      transition: 'width 0.2s ease',
      ['& .MuiDrawer-paper']: {
        width: drawerWidth,
        boxSizing: 'border-box',
        overflowX: 'hidden',
        transition: 'width 0.2s ease',
        top: { xs: 56, md: 64 },
        height: {
          xs: 'calc(100vh - 56px)',
          md: 'calc(100vh - 64px)',
        },
      },
    }}
    variant="permanent"
    anchor="left"
  >
    <Toolbar sx={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end' }}>
      <IconButton onClick={() => setIsCollapsed((prev) => !prev)} size="small">
        {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
      </IconButton>
    </Toolbar>
    <Divider />
    {renderMenuSection(organizerMenu)}
    <Divider />
    {renderMenuSection(duringTournamentMenu)}
    <Divider />
    {renderMenuSection(PersonelMenu)}
  </Drawer>)
}
export default MenuDrawer