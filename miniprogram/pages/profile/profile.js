const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    stats: null,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    this.loadOverview();
  },

  // 加载概览数据
  async loadOverview() {
    try {
      const pets = await app.request('/pets');
      const records = await app.request('/records');
      this.setData({
        stats: {
          petCount: (pets || []).length,
          recordCount: (records || []).length,
        }
      });
    } catch (err) {
      console.error(err);
    }
  },

  goAddPet() {
    wx.navigateTo({ url: '/pages/pet-form/pet-form' });
  },

  goManagePets() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 导出数据功能
  async exportData() {
    try {
      util.showLoading('导出中...');
      const data = await app.request('/export');
      util.hideLoading();

      if (!data || !data.pets || data.pets.length === 0) {
        return util.showError('没有可导出的数据');
      }

      // 生成文本报告
      let report = `🐾 宠物健康记录导出报告\n`;
      report += `导出时间：${util.formatDate(data.exportTime)}\n`;
      report += `━━━━━━━━━━━━━━━━━━\n\n`;

      report += `📊 数据概览\n`;
      report += `宠物数量：${data.summary.totalPets}\n`;
      report += `总记录数：${data.summary.totalRecords}\n`;
      report += `疫苗记录：${data.summary.vaccineCount} 次\n`;
      report += `驱虫记录：${data.summary.dewormCount} 次\n`;
      report += `体重记录：${data.summary.weightCount} 次\n`;
      report += `饮食记录：${data.summary.dietCount} 次\n\n`;

      data.pets.forEach(pet => {
        report += `━━━━━━━━━━━━━━━━━━\n`;
        report += `${util.petIcon(pet.type)} ${pet.name}\n`;
        report += `类型：${pet.type === 'cat' ? '猫' : pet.type === 'dog' ? '狗' : '其他'}`;
        if (pet.breed) report += ` · ${pet.breed}`;
        report += '\n';
        if (pet.birthday) report += `生日：${util.formatDate(pet.birthday)}\n`;
        if (pet.weight) report += `体重：${pet.weight} kg\n`;
        report += `性别：${pet.gender === 'male' ? '公' : '母'}\n`;

        if (pet.records.length > 0) {
          report += `\n📋 记录列表 (${pet.records.length}条)：\n`;
          pet.records.forEach(r => {
            const typeName = util.recordName(r.type);
            report += `  ${util.recordIcon(r.type)} ${typeName}`;
            if (r.name) report += ` · ${r.name}`;
            report += ` · ${util.formatDate(r.date)}`;
            if (r.weightValue) report += ` · ${r.weightValue}kg`;
            if (r.dietAmount) report += ` · ${r.dietAmount}g`;
            if (r.nextDate) report += ` · 下次：${util.formatDate(r.nextDate)}`;
            report += '\n';
          });
        }
        report += '\n';
      });

      // 使用剪贴板复制
      wx.setClipboardData({
        data: report,
        success: () => {
          wx.showModal({
            title: '导出成功',
            content: '数据已复制到剪贴板，可以粘贴到微信、备忘录等应用中保存。',
            showCancel: false,
          });
        },
        fail: () => {
          util.showError('复制失败');
        }
      });
    } catch (err) {
      util.hideLoading();
      console.error(err);
      util.showError('导出失败');
    }
  },

  showAbout() {
    wx.showModal({
      title: '关于',
      content: '宠物健康记录 v1.0\n\n记录宠物的疫苗、驱虫、体重和饮食，到期自动提醒。\n\n用爱守护每一个毛孩子 🐾',
      showCancel: false,
    });
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '宠物健康记录 - 记录每一次关爱',
      path: '/pages/index/index',
    };
  },
});
