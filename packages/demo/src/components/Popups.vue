<template>
  <div class="container">
    <h1>Popups and Dialogs</h1>
    <of-highlight lang="html" :value="sampleCode" />
    <hr />
    <of-button @click="toggleDialog">Show dialog</of-button>
    <of-dialog v-model="dialogActive">
      <template #default>
        <div class="container">
          <h4>Simple Dialog</h4>
          <of-select-field :items="['one', 'two']" label="Test select" />
        </div>
      </template>
    </of-dialog>

    <p></p>

    <of-button @click="toggleSecondDialog">
      Show dialog with header, footer and resize function
    </of-button>
    <of-dialog v-model="secondDialogActive" resize>
      <template #header>
        <div class="of-dialog-fixed-content">Header</div>
      </template>
      <template #default>
        <div class="container">
          <h4>Dialog with nested</h4>
          <of-select-field :items="['one', 'two']" label="Test select" />
          <p>
            <of-button @click="toggleNestedDialog">
              Show nested dialog
            </of-button>
          </p>
        </div>
        <of-dialog v-model="nestedDialogActive">
          <div class="container">
            <h4>Nested Dialog</h4>
            <of-select-field :items="['one', 'two']" label="Test select" />
          </div>
        </of-dialog>
      </template>
      <template #footer>
        <div class="of-dialog-fixed-content">Footer</div>
      </template>
    </of-dialog>

    <p></p>

    <of-button @click="toggleThirdDialog">
      Show dialog with html editor
    </of-button>
    <of-dialog v-model="thirdDialogActive">
      <template #default>
        <div class="container">
          <h1>HTML Editor</h1>
          <of-highlight lang="html" :value="sampleCode" />
          <hr />
          <div class="row">
            <of-field
              v-model="editable"
              label="Editable"
              type="toggle"
              label-position="input"
            />
          </div>
          <br />
          <of-html-editor
            v-model="content"
            @updated="updated"
            :editable="editable"
            label="Message"
          />
        </div>
      </template>
    </of-dialog>

    <p></p>

    <of-button @click="toggleFourthDialog">
      Show dialog with scrolling content
    </of-button>
    <of-dialog v-model="fourthDialogActive">
      <template #header>
        <div class="of-dialog-fixed-content">Header</div>
      </template>
      <template #default>
        <div class="container">
          <h4>Dialog with scrolling content</h4>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <div class="row content">
            <div class="column">
              <div class="demo-form of--elevated-1">
                <div class="row form-row">
                  <div class="column">
                    <of-select-field
                      label="Select"
                      :items="[
                        { value: 'optionA', text: 'A' },
                        { value: 'optionB', text: 'B' },
                      ]"
                      :record="testRecord"
                      name="one"
                    ></of-select-field>
                  </div>
                </div>
                <div class="row form-row">
                  <div class="column">
                    <of-text-field
                      label="Text"
                      name="two"
                      :record="testRecord"
                    />
                  </div>
                </div>
                <div class="row form-row">
                  <div class="column">
                    <of-toggle-field
                      name="three"
                      label="Toggle"
                      label-position="input"
                      :record="testRecord"
                    />
                  </div>
                </div>
                <div class="row form-row">
                  <div class="column">
                    <of-slider-field
                      name="four"
                      label="Slider"
                      :record="testRecord"
                    />
                  </div>
                </div>
                <div class="row form-row">
                  <div class="column">
                    <of-datetime-field
                      name="five"
                      label="Date and time picker"
                      :record="testRecord"
                    />
                  </div>
                </div>
                <div class="row form-row">
                  <div class="column">
                    <of-date-field
                      name="six"
                      label="Date picker"
                      required
                      :record="testRecord"
                    />
                  </div>
                </div>
                <div class="row form-row">
                  <div class="column">
                    <of-time-field
                      name="seven"
                      label="Time picker"
                      :record="testRecord"
                    />
                  </div>
                </div>
                <div class="row form-row">
                  <div class="column">
                    <of-button
                      @click="testRecord.reset()"
                      :disabled="testRecord.locked"
                    >
                      Reset
                    </of-button>
                  </div>
                </div>
              </div>
            </div>
            <div class="column">
              <div class="record-info">
                <h4>Record state</h4>
                <div class="row">
                  <div class="column sm-8">
                    <of-toggle
                      label="Locked"
                      v-model:checked="testRecord.locked"
                      switch
                    />
                  </div>
                </div>
                <div class="row">
                  <div class="column sm-4">Updated:</div>
                  <div class="column sm-8">
                    {{ testRecord.updated || false }}
                  </div>
                </div>
                <of-highlight lang="json" :value="formatValue" />
              </div>
            </div>
          </div>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <div
            class="demo-fields of--elevated-1"
            style="max-width: fit-content"
          >
            <div class="row form-row">
              <div class="column filled" style="margin-right: 5px">
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-row of--pad">
                      <of-field
                        id="pw"
                        input-type="password"
                        label="Password"
                      />
                      <of-field
                        id="cpw"
                        input-type="password"
                        label="Confirm Password"
                      />
                    </div>
                  </div>
                </div>
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-label">Primary Address</div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        label="Street"
                        model-value="99 Street Ave."
                        id="street"
                        variant="filled"
                      />
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        label="City"
                        model-value="Vancouver"
                        variant="filled"
                        id="city5"
                      />
                      <of-field
                        type="text"
                        label="State"
                        model-value="BC"
                        variant="filled"
                        id="state"
                      />
                    </div>
                  </div>
                </div>
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-label">Phone Numbers</div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7777"
                        variant="filled"
                        density="3"
                        id="ph14"
                      />
                      <label class="of-group-label" for="ph14">work</label>
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7778"
                        variant="filled"
                        density="3"
                        id="ph2"
                      />
                      <label class="of-group-label" for="ph2">mobile</label>
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7789"
                        variant="filled"
                        density="3"
                        id="ph31"
                      />
                      <label class="of-group-label" for="ph31">home</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="column filled" style="margin-right: 5px">
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-row of--pad">
                      <of-field
                        id="pw2"
                        input-type="password"
                        label="Password"
                      />
                      <of-field
                        id="cpw2"
                        input-type="password"
                        label="Confirm Password"
                      />
                    </div>
                  </div>
                </div>
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-label">Primary Address</div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        label="Street"
                        model-value="99 Street Ave."
                        id="street2"
                        variant="filled"
                      />
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        label="City"
                        model-value="Vancouver"
                        variant="filled"
                        id="city2"
                      />
                      <of-field
                        type="text"
                        label="State"
                        model-value="BC"
                        variant="filled"
                        id="state2"
                      />
                    </div>
                  </div>
                </div>
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-label">Phone Numbers</div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7777"
                        variant="filled"
                        density="3"
                        id="ph11"
                      />
                      <label class="of-group-label" for="ph11">work</label>
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7778"
                        variant="filled"
                        density="3"
                        id="ph2"
                      />
                      <label class="of-group-label" for="ph2">mobile</label>
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7789"
                        variant="filled"
                        density="3"
                        id="ph32"
                      />
                      <label class="of-group-label" for="ph32">home</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="of-dialog-fixed-content">Footer</div>
      </template>
    </of-dialog>

    <p></p>

    <of-button @click="toggleFifthDialog">
      Show dialog with scrolling & resize
    </of-button>
    <of-dialog v-model="fifthDialogActive" resize>
      <template #header>
        <div class="of-dialog-fixed-content">Header</div>
      </template>
      <template #default>
        <div class="container">
          <h4>Show dialog with resize possibility</h4>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <div class="row content">
            <div class="column">
              <div class="record-info">
                <h4>Record state</h4>
                <div class="row">
                  <div class="column sm-8">
                    <of-toggle
                      label="Locked"
                      v-model:checked="testRecord.locked"
                      switch
                    />
                  </div>
                </div>
                <div class="row">
                  <div class="column sm-4">Updated:</div>
                  <div class="column sm-8">
                    {{ testRecord.updated || false }}
                  </div>
                </div>
                <of-highlight lang="json" :value="formatValue" />
              </div>
            </div>
          </div>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <p>
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
          <div
            class="demo-fields of--elevated-1"
            style="max-width: fit-content"
          >
            <div class="row form-row">
              <div class="column filled" style="margin-right: 5px">
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-row of--pad">
                      <of-field
                        id="pw3"
                        input-type="password"
                        label="Password"
                      />
                      <of-field
                        id="cpw3"
                        input-type="password"
                        label="Confirm Password"
                      />
                    </div>
                  </div>
                </div>
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-label">Primary Address</div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        label="Street"
                        model-value="99 Street Ave."
                        id="street3"
                        variant="filled"
                      />
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        label="City"
                        model-value="Vancouver"
                        variant="filled"
                        id="city3"
                      />
                      <of-field
                        type="text"
                        label="State"
                        model-value="BC"
                        variant="filled"
                        id="state3"
                      />
                    </div>
                  </div>
                </div>
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-label">Phone Numbers</div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7777"
                        variant="filled"
                        density="3"
                        id="ph12"
                      />
                      <label class="of-group-label" for="ph12">work</label>
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7778"
                        variant="filled"
                        density="3"
                        id="ph22"
                      />
                      <label class="of-group-label" for="ph22">mobile</label>
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7789"
                        variant="filled"
                        density="3"
                        id="ph33"
                      />
                      <label class="of-group-label" for="ph33">home</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="column filled" style="margin-right: 5px">
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-row of--pad">
                      <of-field
                        id="pw4"
                        input-type="password"
                        label="Password"
                      />
                      <of-field
                        id="cpw4"
                        input-type="password"
                        label="Confirm Password"
                      />
                    </div>
                  </div>
                </div>
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-label">Primary Address</div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        label="Street"
                        model-value="99 Street Ave."
                        id="street4"
                        variant="filled"
                      />
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        label="City"
                        model-value="Vancouver"
                        variant="filled"
                        id="city4"
                      />
                      <of-field
                        type="text"
                        label="State"
                        model-value="BC"
                        variant="filled"
                        id="state4"
                      />
                    </div>
                  </div>
                </div>
                <div class="of-block">
                  <div class="of-group of--elevated">
                    <div class="of-group-label">Phone Numbers</div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7777"
                        variant="filled"
                        density="3"
                        id="ph13"
                      />
                      <label class="of-group-label" for="ph13">work</label>
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7778"
                        variant="filled"
                        density="3"
                        id="ph23"
                      />
                      <label class="of-group-label" for="ph23">mobile</label>
                    </div>
                    <div class="of-group-row of--pad">
                      <of-field
                        type="text"
                        frame="none"
                        model-value="999-888-7789"
                        variant="filled"
                        density="3"
                        id="ph34"
                      />
                      <label class="of-group-label" for="ph34">home</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="of-dialog-fixed-content">Footer</div>
      </template>
    </of-dialog>

    <p></p>

    <of-button @click="toggleSixthDialog"
      >Show dialog with close button</of-button
    >
    <of-dialog
      v-model="sixthDialogActive"
      :hide-on-blur="false"
      :show-close-button="true"
    >
      <template #default>
        <div class="container">
          <h4>Simple Dialog</h4>
          <of-select-field :items="['one', 'two']" label="Test select" />
        </div>
      </template>
    </of-dialog>
  </div>
</template>

<script lang="ts">
import { makeRecord } from 'oceanfront'
import { computed, defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const sampleCode = `
<of-dialog
  v-model="dialogActive"
/>
`
    const testRecord = makeRecord({
      one: 'optionA',
      two: 'text',
      three: true,
      four: 25,
      five: '2021-03-14 15:45',
      six: '2021-02-15',
      seven: '12:00:00',
      eight: 'https://1crm.com/',
    })
    const textValue = ref('62.14')
    const change = () => {
      textValue.value = new Date().getTime().toString()
    }
    const formatValue = computed(() => {
      return JSON.stringify(testRecord.value, null, 2)
    })

    const content = ref('<h3><i>Oceanfront is the best UI lib!</i></h3>')
    const editable = ref(true)
    const updated = (val: any) => {
      console.log(val)
    }
    const dialogActive = ref(false)
    const secondDialogActive = ref(false)
    const thirdDialogActive = ref(false)
    const fourthDialogActive = ref(false)
    const fifthDialogActive = ref(false)
    const sixthDialogActive = ref(false)

    const nestedDialogActive = ref(false)

    return {
      change,
      formatValue,
      testRecord,
      textValue,
      content,
      editable,
      updated,
      dialogActive,
      secondDialogActive,
      thirdDialogActive,
      fourthDialogActive,
      fifthDialogActive,
      sixthDialogActive,
      nestedDialogActive,
      sampleCode,
      toggleDialog: () => {
        dialogActive.value = !dialogActive.value
      },
      toggleSecondDialog: () => {
        secondDialogActive.value = !secondDialogActive.value
      },
      toggleThirdDialog: () => {
        thirdDialogActive.value = !thirdDialogActive.value
      },
      toggleFourthDialog: () => {
        fourthDialogActive.value = !fourthDialogActive.value
      },
      toggleFifthDialog: () => {
        fifthDialogActive.value = !fifthDialogActive.value
      },
      toggleNestedDialog: () => {
        nestedDialogActive.value = !nestedDialogActive.value
      },
      toggleSixthDialog: () => {
        sixthDialogActive.value = !sixthDialogActive.value
      },
    }
  },
})
</script>
