/**
 * 添加记录页
 *
 * 支持四种记录类型：
 * - vaccine（疫苗）：名称 + 接种日期 + 下次接种日期
 * - deworm（驱虫）：药品名 + 驱虫类型（体内/体外/内外）+ 日期 + 下次日期
 * - weight（体重）：体重值(kg) + 记录日期
 * - diet（饮食）：食物名 + 类型（干粮/湿粮/零食/自制）+ 份量(g) + 日期
 *
 * 关键逻辑：
 * - 每次进入页面（onShow）都重新加载宠物列表，确保最新
 * - 提交成功后重置表单并延迟 1.5s 跳回首页
 * - 无宠物时显示引导，点击跳转到宠物表单页
 */
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    pets: [],         // 原始宠物列表
    petNames: [],     // 格式化后的宠物名称（带图标，用于 picker 展示）
    petIndex: -1,     // 当前选中的宠物索引，-1 表示未选中
    recordType: 'vaccine',  // 当前选择的记录类型
    subType: 'internal',    // 子类型（驱虫：internal/external/both；饮食：dry/wet/snack/homemade）
    name: '',         // 疫苗名称/药品名/食物名
    date: '',         // 记录日期
    nextDate: '',     // 下次日期（疫苗和驱虫）
    weightValue: '',  // 体重值
    amount: '',       // 饮食份量
    note: '',         // 备注
    submitting: false,  // 防止重复提交的锁
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

      // 自动选中逻辑
      if (pets && pets.length > 0) {
        const currentIndex = this.data.petIndex;
        // 如果没有选中，或者选中索引已超出范围，自动选中第一只
        if (currentIndex < 0 || currentIndex >= pets.length) {
          this.setData({ petIndex: 0 });
        }
      } else {
        this.setData({ petIndex: -1 });
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
