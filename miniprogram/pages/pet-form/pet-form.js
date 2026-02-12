/**
 * 宠物表单页（添加/编辑宠物）
 *
 * 这是一个非 TabBar 页面，通过 wx.navigateTo 打开。
 * 页面通过 URL 参数区分模式：
 * - 无参数 → 添加模式
 * - ?action=editPet&petId=123 → 编辑模式，自动加载宠物数据
 *
 * 为什么独立成页面而不嵌在 profile 里：
 *   profile 是 TabBar 页面，不能用 navigateTo 打开。
 *   如果把表单嵌在 profile 里，从其他页面（如首页、添加页）
 *   点"添加宠物"就需要 switchTab 到 profile，导致 TabBar 状态混乱。
 */
const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    isEdit: false,     // 是否为编辑模式
    editPetId: null,   // 编辑模式下的宠物 ID
    petForm: {
      name: '',        // 宠物名字（必填）
      type: 'cat',     // 类型：cat/dog/other
      breed: '',       // 品种
      birthday: '',    // 生日（可选）
      gender: 'male',  // 性别：male/female
      weight: '',      // 体重 kg（可选）
    },
  },

  /**
   * 页面加载时根据 URL 参数决定模式
   * 编辑模式会从后端加载宠物数据并回填表单
   */
  onLoad(options) {
    if (options.action === 'editPet' && options.petId) {
      this.setData({ isEdit: true, editPetId: options.petId });
      this.loadPetData(options.petId);
      wx.setNavigationBarTitle({ title: '编辑宠物' });
    } else {
      wx.setNavigationBarTitle({ title: '添加宠物' });
    }
  },

  async loadPetData(petId) {
    try {
      const pet = await app.request(`/pets/${petId}`);
      if (pet) {
        this.setData({
          petForm: {
            name: pet.name || '',
            type: pet.type || 'cat',
            breed: pet.breed || '',
            birthday: pet.birthday ? util.formatDate(pet.birthday) : '',
            gender: pet.gender || 'male',
            weight: pet.weight ? String(pet.weight) : '',
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  },

  onPetInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`petForm.${field}`]: e.detail.value });
  },

  setPetType(e) {
    this.setData({ 'petForm.type': e.currentTarget.dataset.type });
  },

  setPetGender(e) {
    this.setData({ 'petForm.gender': e.currentTarget.dataset.gender });
  },

  onBirthdayChange(e) {
    this.setData({ 'petForm.birthday': e.detail.value });
  },

  async savePet() {
    const { petForm, isEdit, editPetId } = this.data;

    if (!petForm.name.trim()) {
      return util.showError('请输入宠物名字');
    }

    const data = {
      name: petForm.name.trim(),
      type: petForm.type,
      breed: petForm.breed.trim(),
      birthday: petForm.birthday || null,
      gender: petForm.gender,
      weight: petForm.weight ? parseFloat(petForm.weight) : null,
    };

    try {
      util.showLoading('保存中...');
      if (isEdit) {
        await app.request(`/pets/${editPetId}`, 'PUT', data);
      } else {
        await app.request('/pets', 'POST', data);
      }
      util.hideLoading();
      util.showToast('保存成功');

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      util.hideLoading();
      util.showError('保存失败');
    }
  },

  cancelForm() {
    wx.navigateBack();
  },
});
