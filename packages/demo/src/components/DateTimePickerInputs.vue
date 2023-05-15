<template>
  <of-config
    :locale-params="{ dateTimeFormat: { dateFormat, timeFormat, timeZone } }"
    :locale="locale"
  >
    <div class="container">
      <h1>Date &amp; Time Inputs</h1>
      <of-highlight lang="html" :value="sampleCode" />
      <br />
      <div class="row" style="column-gap: 1em">
        <div class="column">
          <of-select-field
            label="Select Locale"
            :items="localeOpts"
            v-model="locale"
          />
        </div>
        <div class="column">
          <of-select-field
            label="Select Date Format"
            :items="dateFormatOptions"
            v-model="dateFormat"
          />
        </div>
        <div class="column">
          <of-select-field
            label="Select Time Format"
            :items="timeFormatOptions"
            v-model="timeFormat"
          />
        </div>

        <div class="column">
          <of-select-field
            :items="tzOpts"
            label="Select Timezone"
            placeholder="browser"
            v-model="timeZone"
          ></of-select-field>
        </div>
      </div>

      <of-demo-field>
        <template #default="props">
          <of-date-field
            label="Date only"
            v-model="dateValue"
            v-bind="{ ...props, ...customProps }"
          />
        </template>
        <template #options>
          <of-field
            type="toggle"
            label="Show Today Button"
            label-position="input"
            v-model="customProps.showTodayButton"
          />
        </template>
      </of-demo-field>

      <of-demo-field>
        <template #default="props">
          <of-datetime-field
            label="Date and Time"
            v-model="dateTimeValue"
            v-bind="{ ...props, ...customProps }"
          />
        </template>
        <template #options>
          <of-field
            type="toggle"
            label="Show Today button"
            label-position="input"
            v-model="customProps.showTodayButton"
          />
        </template>
      </of-demo-field>

      <of-demo-field>
        <template #default="props">
          <of-time-field label="Time only" v-model="timeValue" v-bind="props" />
        </template>
      </of-demo-field>
    </div>
  </of-config>
</template>

<script lang="ts">
import { ref, defineComponent, Ref, reactive } from 'vue'

const dateTimeValue = ref('2021-03-05 12:00')
const dateValue = ref('2021-03-05')
const timeValue = ref('18:55')

export default defineComponent({
  setup() {
    const sampleCode = `
<of-datetime-field
  label="Date and time"
  v-model="inputValue"
/>
`
    const dateFormat = ref('')
    const dateFormatOptions = [
      { text: 'default', value: '' },
      { text: 'Y-m-d', value: 'Y-m-d' },
      { text: 'm-d-Y', value: 'm-d-Y' },
      { text: 'd-m-Y', value: 'd-m-Y' },
      { text: 'Y/m/d', value: 'Y/m/d' },
      { text: 'm/d/Y', value: 'm/d/Y' },
      { text: 'd/m/Y', value: 'd/m/Y' },
      { text: 'Y.m.d', value: 'Y.m.d' },
      { text: 'd.m.Y', value: 'd.m.Y' },
      { text: 'm.d.Y', value: 'm.d.Y' },
    ]

    const timeFormat = ref('')
    const timeFormatOptions = [
      { text: 'default', value: '' },
      { text: 'H:i', value: 'H:i' },
      { text: 'h:ia', value: 'h:ia' },
      { text: 'h:i a', value: 'h:i a' },
      { text: 'h:iA', value: 'h:iA' },
      { text: 'h:i A', value: 'h:i A' },
      { text: 'H.i', value: 'H.i' },
      { text: 'h.ia', value: 'h.ia' },
      { text: 'h.i a', value: 'h.i a' },
      { text: 'h.iA', value: 'h.iA' },
      { text: 'h.i A', value: 'h.i A' },
    ]

    const locale = ref('')
    const localeOpts = [
      { text: 'default', value: '' },
      { text: 'en-CA', value: 'en-CA' },
      { text: 'de-CH', value: 'de-CH' },
      { text: 'de-DE', value: 'de-DE' },
      { text: 'fr-FR', value: 'fr-FR' },
    ]

    const timezones = [
      'Africa/Algiers',
      'Africa/Luanda',
      'Africa/Porto-Novo',
      'Africa/Gaborone',
      'Africa/Ouagadougou',
      'Africa/Bujumbura',
      'Africa/Douala',
      'Atlantic/Cape_Verde',
      'Africa/Bangui',
      'Africa/Ndjamena',
      'Indian/Comoro',
      'Africa/Kinshasa',
      'Africa/Lubumbashi',
      'Africa/Brazzaville',
      'Africa/Abidjan',
      'Africa/Djibouti',
      'Africa/Cairo',
      'Africa/Malabo',
      'Africa/Asmera',
      'Africa/Addis_Ababa',
      'Africa/Libreville',
      'Africa/Banjul',
      'Africa/Accra',
      'Africa/Conakry',
      'Africa/Bissau',
      'Africa/Nairobi',
      'Africa/Maseru',
      'Africa/Monrovia',
      'Africa/Tripoli',
      'Indian/Antananarivo',
      'Africa/Blantyre',
      'Africa/Bamako',
      'Africa/Nouakchott',
      'Indian/Mauritius',
      'Indian/Mayotte',
      'Africa/Casablanca',
      'Africa/El_Aaiun',
      'Africa/Maputo',
      'Africa/Windhoek',
      'Africa/Niamey',
      'Africa/Lagos',
      'Indian/Reunion',
      'Africa/Kigali',
      'Atlantic/St_Helena',
      'Africa/Sao_Tome',
      'Africa/Dakar',
      'Indian/Mahe',
      'Africa/Freetown',
      'Africa/Mogadishu',
      'Africa/Johannesburg',
      'Africa/Khartoum',
      'Africa/Mbabane',
      'Africa/Dar_es_Salaam',
      'Africa/Lome',
      'Africa/Tunis',
      'Africa/Kampala',
      'Africa/Lusaka',
      'Africa/Harare',
      'Antarctica/Casey',
      'Antarctica/Davis',
      'Antarctica/Mawson',
      'Indian/Kerguelen',
      'Antarctica/DumontDUrville',
      'Antarctica/Syowa',
      'Antarctica/Vostok',
      'Antarctica/Rothera',
      'Antarctica/Palmer',
      'Antarctica/McMurdo',
      'Asia/Kabul',
      'Asia/Yerevan',
      'Asia/Baku',
      'Asia/Bahrain',
      'Asia/Dhaka',
      'Asia/Thimphu',
      'Indian/Chagos',
      'Asia/Brunei',
      'Asia/Rangoon',
      'Asia/Phnom_Penh',
      'Asia/Harbin',
      'Asia/Shanghai',
      'Asia/Chongqing',
      'Asia/Urumqi',
      'Asia/Kashgar',
      'Asia/Hong_Kong',
      'Asia/Taipei',
      'Asia/Macau',
      'Asia/Nicosia',
      'Asia/Tbilisi',
      'Asia/Dili',
      'Asia/Calcutta',
      'Asia/Jakarta',
      'Asia/Pontianak',
      'Asia/Makassar',
      'Asia/Jayapura',
      'Asia/Tehran',
      'Asia/Baghdad',
      'Asia/Jerusalem',
      'Asia/Tokyo',
      'Asia/Amman',
      'Asia/Almaty',
      'Asia/Qyzylorda',
      'Asia/Aqtobe',
      'Asia/Aqtau',
      'Asia/Oral',
      'Asia/Bishkek',
      'Asia/Seoul',
      'Asia/Pyongyang',
      'Asia/Kuwait',
      'Asia/Vientiane',
      'Asia/Beirut',
      'Asia/Kuala_Lumpur',
      'Asia/Kuching',
      'Indian/Maldives',
      'Asia/Hovd',
      'Asia/Ulaanbaatar',
      'Asia/Choibalsan',
      'Asia/Katmandu',
      'Asia/Muscat',
      'Asia/Karachi',
      'Asia/Gaza',
      'Asia/Manila',
      'Asia/Qatar',
      'Asia/Riyadh',
      'Asia/Singapore',
      'Asia/Colombo',
      'Asia/Damascus',
      'Asia/Dushanbe',
      'Asia/Bangkok',
      'Asia/Ashgabat',
      'Asia/Dubai',
      'Asia/Samarkand',
      'Asia/Tashkent',
      'Asia/Saigon',
      'Asia/Aden',
      'Australia/Darwin',
      'Australia/Perth',
      'Australia/Brisbane',
      'Australia/Lindeman',
      'Australia/Adelaide',
      'Australia/Hobart',
      'Australia/Currie',
      'Australia/Melbourne',
      'Australia/Sydney',
      'Australia/Broken_Hill',
      'Indian/Christmas',
      'Pacific/Rarotonga',
      'Indian/Cocos',
      'Pacific/Fiji',
      'Pacific/Gambier',
      'Pacific/Marquesas',
      'Pacific/Tahiti',
      'Pacific/Guam',
      'Pacific/Tarawa',
      'Pacific/Enderbury',
      'Pacific/Kiritimati',
      'Pacific/Saipan',
      'Pacific/Majuro',
      'Pacific/Kwajalein',
      'Pacific/Truk',
      'Pacific/Ponape',
      'Pacific/Kosrae',
      'Pacific/Nauru',
      'Pacific/Noumea',
      'Pacific/Auckland',
      'Pacific/Chatham',
      'Pacific/Niue',
      'Pacific/Norfolk',
      'Pacific/Palau',
      'Pacific/Port_Moresby',
      'Pacific/Pitcairn',
      'Pacific/Pago_Pago',
      'Pacific/Apia',
      'Pacific/Guadalcanal',
      'Pacific/Fakaofo',
      'Pacific/Tongatapu',
      'Pacific/Funafuti',
      'Pacific/Johnston',
      'Pacific/Midway',
      'Pacific/Wake',
      'Pacific/Efate',
      'Pacific/Wallis',
      'Europe/London',
      'Europe/Dublin',
      'WET',
      'CET',
      'MET',
      'EET',
      'Europe/Tirane',
      'Europe/Andorra',
      'Europe/Vienna',
      'Europe/Minsk',
      'Europe/Brussels',
      'Europe/Sofia',
      'Europe/Prague',
      'Europe/Copenhagen',
      'Atlantic/Faeroe',
      'America/Danmarkshavn',
      'America/Scoresbysund',
      'America/Godthab',
      'America/Thule',
      'Europe/Tallinn',
      'Europe/Helsinki',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Gibraltar',
      'Europe/Athens',
      'Europe/Budapest',
      'Atlantic/Reykjavik',
      'Europe/Rome',
      'Europe/Riga',
      'Europe/Vaduz',
      'Europe/Vilnius',
      'Europe/Luxembourg',
      'Europe/Malta',
      'Europe/Chisinau',
      'Europe/Monaco',
      'Europe/Amsterdam',
      'Europe/Oslo',
      'Europe/Warsaw',
      'Europe/Lisbon',
      'Atlantic/Azores',
      'Atlantic/Madeira',
      'Europe/Bucharest',
      'Europe/Kaliningrad',
      'Europe/Moscow',
      'Europe/Samara',
      'Asia/Yekaterinburg',
      'Asia/Omsk',
      'Asia/Novosibirsk',
      'Asia/Krasnoyarsk',
      'Asia/Irkutsk',
      'Asia/Yakutsk',
      'Asia/Vladivostok',
      'Asia/Sakhalin',
      'Asia/Magadan',
      'Asia/Kamchatka',
      'Asia/Anadyr',
      'Europe/Belgrade',
      'Europe/Madrid',
      'Africa/Ceuta',
      'Atlantic/Canary',
      'Europe/Stockholm',
      'Europe/Zurich',
      'Europe/Istanbul',
      'Europe/Kiev',
      'Europe/Uzhgorod',
      'Europe/Zaporozhye',
      'Europe/Simferopol',
      'America/New_York',
      'America/Chicago',
      'America/North_Dakota/Center',
      'America/Denver',
      'America/Los_Angeles',
      'America/Juneau',
      'America/Yakutat',
      'America/Anchorage',
      'America/Nome',
      'America/Adak',
      'Pacific/Honolulu',
      'America/Phoenix',
      'America/Boise',
      'America/Indiana/Indianapolis',
      'America/Indiana/Marengo',
      'America/Indiana/Knox',
      'America/Indiana/Vevay',
      'America/Kentucky/Louisville',
      'America/Kentucky/Monticello',
      'America/Detroit',
      'America/Menominee',
      'America/St_Johns',
      'America/Goose_Bay',
      'America/Halifax',
      'America/Glace_Bay',
      'America/Montreal',
      'America/Toronto',
      'America/Thunder_Bay',
      'America/Nipigon',
      'America/Rainy_River',
      'America/Winnipeg',
      'America/Regina',
      'America/Swift_Current',
      'America/Edmonton',
      'America/Vancouver',
      'America/Dawson_Creek',
      'America/Pangnirtung',
      'America/Iqaluit',
      'America/Coral_Harbour',
      'America/Rankin_Inlet',
      'America/Cambridge_Bay',
      'America/Yellowknife',
      'America/Inuvik',
      'America/Whitehorse',
      'America/Dawson',
      'America/Cancun',
      'America/Merida',
      'America/Monterrey',
      'America/Mexico_City',
      'America/Chihuahua',
      'America/Hermosillo',
      'America/Mazatlan',
      'America/Tijuana',
      'America/Anguilla',
      'America/Antigua',
      'America/Nassau',
      'America/Barbados',
      'America/Belize',
      'Atlantic/Bermuda',
      'America/Cayman',
      'America/Costa_Rica',
      'America/Havana',
      'America/Dominica',
      'America/Santo_Domingo',
      'America/El_Salvador',
      'America/Grenada',
      'America/Guadeloupe',
      'America/Guatemala',
      'America/Port-au-Prince',
      'America/Tegucigalpa',
      'America/Jamaica',
      'America/Martinique',
      'America/Montserrat',
      'America/Managua',
      'America/Panama',
      'America/Puerto_Rico',
      'America/St_Kitts',
      'America/St_Lucia',
      'America/Miquelon',
      'America/St_Vincent',
      'America/Grand_Turk',
      'America/Tortola',
      'America/St_Thomas',
      'America/Argentina/Buenos_Aires',
      'America/Argentina/Cordoba',
      'America/Argentina/Tucuman',
      'America/Argentina/La_Rioja',
      'America/Argentina/San_Juan',
      'America/Argentina/Jujuy',
      'America/Argentina/Catamarca',
      'America/Argentina/Mendoza',
      'America/Argentina/Rio_Gallegos',
      'America/Argentina/Ushuaia',
      'America/Aruba',
      'America/La_Paz',
      'America/Noronha',
      'America/Belem',
      'America/Fortaleza',
      'America/Recife',
      'America/Araguaina',
      'America/Maceio',
      'America/Bahia',
      'America/Sao_Paulo',
      'America/Campo_Grande',
      'America/Cuiaba',
      'America/Porto_Velho',
      'America/Boa_Vista',
      'America/Manaus',
      'America/Eirunepe',
      'America/Rio_Branco',
      'America/Santiago',
      'Pacific/Easter',
      'America/Bogota',
      'America/Curacao',
      'America/Guayaquil',
      'Pacific/Galapagos',
      'Atlantic/Stanley',
      'America/Cayenne',
      'America/Guyana',
      'America/Asuncion',
      'America/Lima',
      'Atlantic/South_Georgia',
      'America/Paramaribo',
      'America/Port_of_Spain',
      'America/Montevideo',
      'America/Caracas',
    ]
    timezones.sort()
    const tzOpts = { items: [] as Record<string, any>[] }
    const timeZone: Ref<string | string[]> = ref('America/Vancouver')
    let tzGrp = null
    for (const value of timezones) {
      const gPos = value.indexOf('/')
      const text = value.replace(/_/g, ' ')
      const grp = value.substring(0, gPos)
      if (grp !== tzGrp) {
        tzOpts.items.push({ special: 'header', text: grp })
        tzGrp = grp
      }
      tzOpts.items.push({ text, value })
    }
    const customProps = reactive({ showTodayButton: true })
    return {
      sampleCode,
      dateValue,
      dateTimeValue,
      timeValue,
      dateFormatOptions,
      dateFormat,
      timeFormatOptions,
      timeFormat,
      localeOpts,
      locale,
      tzOpts,
      timeZone,
      customProps,
    }
  },
})
</script>
