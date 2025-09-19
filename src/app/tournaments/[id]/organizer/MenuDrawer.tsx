import { Divider, Drawer, List, ListItem, ListItemButton, ListItemText, Toolbar } from '@mui/material'

const drawerWidth = 240

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
      {['ดำเนินการแข่งขัน', 'สรุปทีมเข้ารอบ', 'สรุปผลการแข่งขัน'].map((text) => (
        <ListItem key={text} disablePadding>
          <ListItemButton>
            <ListItemText primary={text} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
    <Divider />
    <List>
      {['ผู้จัดการ', 'กรรมการ'].map((text) => (
        <ListItem key={text} disablePadding>
          <ListItemButton>
            <ListItemText primary={text} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  </Drawer>)
}
export default MenuDrawer