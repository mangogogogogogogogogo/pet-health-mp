const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    allRecords: [],
    records: [],
    pets: [],
    petFilterNames: ['全部宠物'],
    petFilterIndex: 0,
    typeFilterNames: ['全部类型', '疫苗', '驱虫', '体重', '饮食'],
    typeFilterValues: ['all', 'vaccine', 'deworm', 'weight', 'diet'],
    typeFilterIndex: 0,
    loading: true,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
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
      const [pets, records] = await Promise.all([
        app.request('/pets'),
        app.request('/records'),
      ]);

      const petFilterNames = ['全部宠物', ...(pets || []).map(p => `${util.petIcon(p.type)} ${p.name}`)];

      const formatted = (records || []).map(r => {
        const pet = (pets || []).find(p => p.id === r.pet_id);
        let detail = '';
        if (r.type === 'vaccine') detail = r.record_name || '疫苗接种';
        else if (r.type === 'deworm') {
          const subName = r.sub_type === 'internal' ? '体内' : r.sub_type === 'external' ? '体外' : '内外';
          detail = `${r.record_name || '驱虫'} · ${subName}`;
        } else if (r.type === 'weight') detail = `${r.weight_value} kg`;
        else if (r.type === 'diet') detail = `${r.record_name || '饮食'}${r.diet_amount ? ' · ' + r.diet_amount + 'g' : ''}`;

        return {
          ...r,
          petName: pet ? pet.name : '未知',
          icon: util.recordIcon(r.type),
          typeName: util.recordName(r.type),
          detail,
          dateStr: util.formatDate(r.record_date || r.created_at),
        };
      }).sort((a, b) => new Date(b.record_date || b.created_at) - new Date(a.record_date || a.created_at));

      this.setData({ pets, allRecords: formatted, records: formatted, petFilterNames, loading: false });
    } catch (err) {
      console.error(err);
      this.setData({ loading: false });
    }
  },

  onPetFilter(e) {
    this.setData({ petFilterIndex: parseInt(e.detail.value) });
    this.applyFilter();
  },

  onTypeFilter(e) {
    this.setData({ typeFilterIndex: parseInt(e.detail.value) });
    this.applyFilter();
  },

  applyFilter() {
    const { allRecords, pets, petFilterIndex, typeFilterValues, typeFilterIndex } = this.data;
    let filtered = [...allRecords];

    if (petFilterIndex > 0 && pets[petFilterIndex - 1]) {
      const petId = pets[petFilterIndex - 1].id;
      filtered = filtered.filter(r => r.pet_id === petId);
    }

    const typeVal = typeFilterValues[typeFilterIndex];
    if (typeVal !== 'all') {
      filtered = filtered.filter(r => r.type === typeVal);
    }

    this.setData({ records: filtered });
  },

  goAdd() {
    wx.switchTab({ url: '/pages/add/add' });
  },

  onRecordLongPress(e) {
    const id = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['删除'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '确认',
            content: '确定要删除这条记录吗？',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                try {
                  await app.request(`/records/${id}`, 'DELETE');
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
});
