/**
 * 首页
 *
 * 展示内容：
 * 1. 用户的宠物列表（带图标、品种、年龄、体重）
 * 2. 即将到期的提醒（14 天内的疫苗/驱虫到期提醒）
 *
 * 交互：
 * - 点击宠物卡片 → 进入该宠物的统计页
 * - 长按宠物卡片 → 编辑/删除菜单
 * - 点击"添加宠物" → 跳转到宠物表单页（非 TabBar 页，用 navigateTo）
 * - 点击"添加记录" → 切换到添加页（TabBar 页，用 switchTab）
 */
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    pets: [],       // 宠物列表（已格式化，含 icon、age 等展示字段）
    reminders: [],  // 即将到期的提醒列表（已格式化，含状态和倒计时文案）
    loading: true,
  },

  onShow() {
    // 设置 TabBar 选中状态（自定义 TabBar 需要手动同步）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.loadData();
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadData();
    wx.stopPullDownRefresh();
  },

  async loadData() {
    try {
      // 加载宠物列表
      const pets = await app.request('/pets');
      const formattedPets = (pets || []).map(p => ({
        ...p,
        icon: util.petIcon(p.type),
        typeName: p.type === 'cat' ? '猫咪' : p.type === 'dog' ? '狗狗' : '宠物',
        age: util.getAge(p.birthday),
      }));

      // 加载提醒
      const reminders = await app.request('/reminders/upcoming');
      // 提醒状态分类逻辑：
      // - overdue: 已过期（next_date < 今天）
      // - upcoming: 即将到期（0~7 天内）
      // - safe: 安全（7 天以上）
      const formattedReminders = (reminders || []).map(r => {
        const days = util.diffDays(r.next_date);
        let status = 'safe';
        let badgeText = `还剩${days}天`;
        if (days < 0) { status = 'overdue'; badgeText = `已过期${Math.abs(days)}天`; }
        else if (days === 0) { status = 'upcoming'; badgeText = '今天'; }
        else if (days <= 7) { status = 'upcoming'; badgeText = `还剩${days}天`; }

        return {
          ...r,
          icon: util.recordIcon(r.type),
          name: r.record_name || util.recordName(r.type),
          petName: r.pet_name || '未知',
          nextDate: util.formatDate(r.next_date),
          status,
          badgeText,
        };
      });

      this.setData({ pets: formattedPets, reminders: formattedReminders, loading: false });
    } catch (err) {
      console.error('加载数据失败', err);
      this.setData({ loading: false });
    }
  },

  // 添加宠物
  goAddPet() {
    wx.navigateTo({ url: '/pages/pet-form/pet-form' });
  },

  // 点击宠物卡片 - 查看详情/统计
  onPetTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/stats/stats?petId=${id}` });
  },

  // 宠物操作菜单
  onPetAction(e) {
    const id = e.currentTarget.dataset.id;
    const pet = this.data.pets.find(p => p.id === id);
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          wx.navigateTo({ url: `/pages/pet-form/pet-form?action=editPet&petId=${id}` });
        } else if (res.tapIndex === 1) {
          wx.showModal({
            title: '确认删除',
            content: `确定要删除 ${pet ? pet.name : '这只宠物'} 吗？所有相关记录也会被删除。`,
            success: async (modalRes) => {
              if (modalRes.confirm) {
                try {
                  await app.request(`/pets/${id}`, 'DELETE');
                  util.showToast('已删除');
                  this.loadData();
                } catch (err) {
                  util.showError('删除失败');
                }
              }
            }
          });
        }
      }
    });
  },

  // 快速添加记录
  goAddRecord() {
    wx.switchTab({ url: '/pages/add/add' });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '宠物健康记录 - 记录每一次关爱',
      path: '/pages/index/index',
    };
  },
});
