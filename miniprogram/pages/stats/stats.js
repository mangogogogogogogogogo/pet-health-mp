const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    petId: null,
    pets: [],
    petNames: [],
    petIndex: -1,
    stats: null,
  },

  onLoad(options) {
    if (options.petId) {
      this.setData({ petId: options.petId });
      this.loadStats(options.petId);
    }
  },

  onShow() {
    if (!this.data.petId) {
      this.loadPets();
    }
  },

  async loadPets() {
    try {
      const pets = await app.request('/pets');
      const petNames = (pets || []).map(p => `${util.petIcon(p.type)} ${p.name}`);
      this.setData({ pets, petNames });
    } catch (err) {
      console.error(err);
    }
  },

  onPetChange(e) {
    const index = parseInt(e.detail.value);
    const pet = this.data.pets[index];
    if (pet) {
      this.setData({ petIndex: index, petId: pet.id });
      this.loadStats(pet.id);
    }
  },

  async loadStats(petId) {
    try {
      util.showLoading();
      const data = await app.request(`/stats/${petId}`);
      util.hideLoading();

      if (data) {
        const stats = {
          petName: data.pet.name,
          petIcon: util.petIcon(data.pet.type),
          petBreed: data.pet.breed || (data.pet.type === 'cat' ? '猫咪' : '狗狗'),
          petAge: util.getAge(data.pet.birthday),
          totalRecords: data.total_records || 0,
          currentWeight: data.current_weight,
          vaccineCount: data.vaccine_count || 0,
          dewormCount: data.deworm_count || 0,
          lastVaccine: data.last_vaccine ? {
            name: data.last_vaccine.record_name || '疫苗',
            date: util.formatDate(data.last_vaccine.record_date),
            nextDate: data.last_vaccine.next_date ? util.formatDate(data.last_vaccine.next_date) : '',
          } : null,
          lastDeworm: data.last_deworm ? {
            name: data.last_deworm.record_name || '驱虫',
            date: util.formatDate(data.last_deworm.record_date),
            nextDate: data.last_deworm.next_date ? util.formatDate(data.last_deworm.next_date) : '',
          } : null,
          weightHistory: (data.weight_history || []).map(w => ({
            date: util.formatDate(w.record_date),
            value: w.weight_value,
          })),
        };
        this.setData({ stats });
      }
    } catch (err) {
      util.hideLoading();
      console.error(err);
    }
  },
});
