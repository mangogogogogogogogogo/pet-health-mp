const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    pets: [],
    petNames: [],
    petIndex: -1,
    recordType: 'vaccine',
    subType: 'internal',
    name: '',
    date: '',
    nextDate: '',
    weightValue: '',
    amount: '',
    note: '',
    submitting: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.loadPets();
    this.setData({ date: util.getToday() });
  },

  async loadPets() {
    try {
      const pets = await app.request('/pets');
      const petNames = (pets || []).map(p => `${util.petIcon(p.type)} ${p.name}`);
      this.setData({ pets, petNames });

      // 如果只有一只宠物，自动选中
      if (pets && pets.length === 1 && this.data.petIndex < 0) {
        this.setData({ petIndex: 0 });
      }
    } catch (err) {
      console.error(err);
    }
  },

  onPetChange(e) {
    this.setData({ petIndex: parseInt(e.detail.value) });
  },

  setType(e) {
    const type = e.currentTarget.dataset.type;
    let subType = 'internal';
    if (type === 'diet') subType = 'dry';
    this.setData({ recordType: type, subType, name: '', nextDate: '', weightValue: '', amount: '' });
  },

  setSubType(e) {
    this.setData({ subType: e.currentTarget.dataset.type });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  async submitRecord() {
    if (this.data.submitting) return;

    const { pets, petIndex, recordType, subType, name, date, nextDate, weightValue, amount, note } = this.data;

    if (petIndex < 0 || !pets[petIndex]) {
      return util.showError('请选择宠物');
    }

    if (recordType === 'weight' && !weightValue) {
      return util.showError('请输入体重');
    }

    if (recordType === 'vaccine' && !name) {
      return util.showError('请输入疫苗名称');
    }

    const petId = pets[petIndex].id;
    const record = {
      pet_id: petId,
      type: recordType,
      record_name: name,
      record_date: date,
      next_date: nextDate || null,
      sub_type: subType,
      weight_value: weightValue ? parseFloat(weightValue) : null,
      diet_amount: amount ? parseFloat(amount) : null,
      note: note,
    };

    try {
      this.setData({ submitting: true });
      util.showLoading('保存中...');
      await app.request('/records', 'POST', record);
      util.hideLoading();
      util.showToast('保存成功');

      // 重置表单
      this.setData({
        name: '',
        date: util.getToday(),
        nextDate: '',
        weightValue: '',
        amount: '',
        note: '',
        submitting: false,
      });

      // 返回首页
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' });
      }, 1500);
    } catch (err) {
      util.hideLoading();
      this.setData({ submitting: false });
      util.showError('保存失败');
    }
  },

  // 没有宠物时引导添加
  goAddPet() {
    wx.navigateTo({ url: '/pages/pet-form/pet-form' });
  },
});
