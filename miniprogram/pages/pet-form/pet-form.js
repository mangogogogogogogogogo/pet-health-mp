const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    isEdit: false,
    editPetId: null,
    petForm: {
      name: '',
      type: 'cat',
      breed: '',
      birthday: '',
      gender: 'male',
      weight: '',
    },
  },

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
