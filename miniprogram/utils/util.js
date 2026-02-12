/**
 * 工具函数
 */

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 获取今天日期字符串
function getToday() {
  return formatDate(new Date());
}

// 计算年龄
function getAge(birthday) {
  if (!birthday) return '';
  const birth = new Date(birthday);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months}个月`;
  const years = Math.floor(months / 12);
  const remain = months % 12;
  return remain > 0 ? `${years}岁${remain}月` : `${years}岁`;
}

// 计算天数差
function diffDays(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

// 宠物类型图标
function petIcon(type) {
  const icons = { cat: '🐱', dog: '🐶', other: '🐹' };
  return icons[type] || '🐾';
}

// 记录类型图标
function recordIcon(type) {
  const icons = { vaccine: '💉', deworm: '💊', weight: '⚖️', diet: '🍖' };
  return icons[type] || '📋';
}

// 记录类型名称
function recordName(type) {
  const names = { vaccine: '疫苗', deworm: '驱虫', weight: '体重', diet: '饮食' };
  return names[type] || type;
}

// 显示加载中
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

function hideLoading() {
  wx.hideLoading();
}

function showToast(title, icon = 'success') {
  wx.showToast({ title, icon, duration: 1500 });
}

function showError(title) {
  wx.showToast({ title, icon: 'none', duration: 2000 });
}

module.exports = {
  formatDate,
  getToday,
  getAge,
  diffDays,
  petIcon,
  recordIcon,
  recordName,
  showLoading,
  hideLoading,
  showToast,
  showError,
};
