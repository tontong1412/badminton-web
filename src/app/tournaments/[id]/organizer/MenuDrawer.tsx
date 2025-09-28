import { Divider, Drawer, List, ListItem, ListItemButton, ListItemText, Toolbar } from '@mui/material'

const drawerWidth = 200

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
  return (<Drawer
    sx={{
      width: drawerWidth,
      flexShrink: 0,
      ['& .MuiDrawer-paper']: { width: drawerWidth, boxSizing: 'border-box' },
    }}
    variant="permanent"
    anchor="left"
  >
    <Toolbar />
    <Divider />
    <List>
      {organizerMenu.map((menu) => (
        <ListItem key={menu.title} disablePadding >
          <ListItemButton href={`/tournaments/${tournamentID}/organizer/${menu.action}`}>
            <ListItemText primary={menu.title} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
    <Divider />
    <List>
      {duringTournamentMenu.map((menu) => (
        <ListItem key={menu.title} disablePadding >
          <ListItemButton href={`/tournaments/${tournamentID}/organizer/${menu.action}`}>
            <ListItemText primary={menu.title} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
    <Divider />
    <List>
      {PersonelMenu.map((menu) => (
        <ListItem key={menu.title} disablePadding >
          <ListItemButton href={`/tournaments/${tournamentID}/organizer/${menu.action}`}>
            <ListItemText primary={menu.title} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  </Drawer>)
}
export default MenuDrawer