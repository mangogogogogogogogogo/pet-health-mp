const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    reminders: [],
    filteredReminders: [],
    filter: 'all',
    overdueCount: 0,
    upcomingCount: 0,
    safeCount: 0,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.loadReminders();
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadReminders();
    wx.stopPullDownRefresh();
  },

  async loadReminders() {
    try {
      const reminders = await app.request('/reminders');
      const formatted = (reminders || []).map(r => {
        const days = util.diffDays(r.next_date);
        let status = 'safe';
        let badgeText = `还剩${days}天`;
        if (days < 0) { status = 'overdue'; badgeText = `已过期${Math.abs(days)}天`; }
        else if (days === 0) { status = 'upcoming'; badgeText = '今天到期'; }
        else if (days <= 7) { status = 'upcoming'; }

        return {
          ...r,
          icon: util.recordIcon(r.type),
          name: r.record_name || util.recordName(r.type),
          nextDate: util.formatDate(r.next_date),
          petName: r.pet_name || '未知',
          status,
          badgeText,
          days,
        };
      });

      const overdueCount = formatted.filter(r => r.status === 'overdue').length;
      const upcomingCount = formatted.filter(r => r.status === 'upcoming').length;
      const safeCount = formatted.filter(r => r.status === 'safe').length;

      this.setData({ reminders: formatted, overdueCount, upcomingCount, safeCount });
      this.applyFilter();
    } catch (err) {
      console.error(err);
    }
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter });
    this.applyFilter();
  },

  applyFilter() {
    const { reminders, filter } = this.data;
    let filtered = reminders;
    if (filter !== 'all') {
      filtered = reminders.filter(r => r.status === filter);
    }
    this.setData({ filteredReminders: filtered });
  },

  // 点击提醒 - 操作菜单
  onReminderTap(e) {
    const id = e.currentTarget.dataset.id;
    const reminder = this.data.reminders.find(r => r.id === id);
    if (!reminder) return;

    const items = ['去添加新记录', '删除此提醒'];
    wx.showActionSheet({
      itemList: items,
      success: async (res) => {
        if (res.tapIndex === 0) {
          // 跳转到添加记录页
          wx.switchTab({ url: '/pages/add/add' });
        } else if (res.tapIndex === 1) {
          // 删除该记录（清除 next_date 即可）
          wx.showModal({
            title: '确认',
            content: '删除此提醒将同时删除关联的记录，确定吗？',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                try {
                  await app.request(`/records/${id}`, 'DELETE');
                  util.showToast('已删除');
                  this.loadReminders();
                } catch (err) {
                  util.showError('操作失败');
                }
              }
            }
          });
        }
      }
    });
  },
});
