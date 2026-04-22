<template>
  <section class="container">
    <div class="demo-block">
      <div class="demo-title">Badges</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <div class="badge">Badge</div>
          {{ ' ' }}
          <div class="badge state-label">Label</div>
          {{ ' ' }}
          <!-- div class="badge state-selected">Selected</div -->
          {{ ' ' }}
          <div class="badge state-success">Success</div>
          {{ ' ' }}
          <div class="badge state-error">Error</div>
          {{ ' ' }}
          <div class="badge state-draft">Draft</div>
          {{ ' ' }}
          <div class="badge state-pending">Pending</div>
          {{ ' ' }}
          <div class="badge state-deferred">Deferred</div>
          {{ ' ' }}
          <div class="badge state-active">Active</div>
          {{ ' ' }}
          <div class="badge state-info">Info</div>
          {{ ' ' }}
          <div class="badge state-final">Final</div>
          {{ ' ' }}
          <div class="badge state-special">Special</div>
          {{ ' ' }}
          <div class="badge state-closed">Closed</div>
          {{ ' ' }}
          <div class="badge state-dead">Dead</div>
          {{ ' ' }}
          <div class="badge state-alert">Alert</div>
          {{ ' ' }}
          <div class="badge state-warning">Warning</div>
          {{ ' ' }}
          <div class="badge state-danger">Danger</div>
          {{ ' ' }}
        </div>
      </div>

      <div class="demo-title">Icons</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <div
            class="demo-icon input-icon icon-expand-up"
            title="expand up"
          ></div>
          <div
            class="demo-icon input-icon icon-expand-down"
            title="expand down"
          ></div>
          <div class="demo-icon input-icon icon-expand" title="expand"></div>
          <div
            class="demo-icon input-icon icon-expand-close"
            title="expand close"
          ></div>
          <div class="demo-icon input-icon icon-menu" title="menu"></div>
          <div
            class="demo-icon input-icon icon-alt-menu"
            title="alt menu"
          ></div>
          <div
            class="demo-icon input-icon icon-ellipsis"
            title="ellipsis"
          ></div>
          <div class="demo-icon input-icon icon-accept" title="accept"></div>
          <div class="demo-icon input-icon icon-cancel" title="cancel"></div>
          <div class="demo-icon input-icon icon-gear" title="gear"></div>
          <div class="demo-icon input-icon icon-print" title="print"></div>
          <div class="demo-icon input-icon icon-refresh" title="refresh"></div>
        </div>
        <div class="demo-inline">
          <div
            class="demo-icon input-icon icon-required"
            title="required"
          ></div>
          <div class="demo-icon input-icon icon-email" title="email"></div>
          <div class="demo-icon input-icon icon-mobile" title="mobile"></div>
          <div class="demo-icon input-icon icon-phone" title="phone"></div>
          <div
            class="demo-icon input-icon icon-external"
            title="external"
          ></div>
          <div
            class="demo-icon input-icon icon-attach"
            title="attachment"
          ></div>
          <div class="demo-icon input-icon icon-plus" title="plus"></div>
          <div class="demo-icon input-icon icon-user" title="user"></div>
          <div class="demo-icon input-icon icon-lock" title="lock"></div>
          <div class="demo-icon input-icon icon-search" title="search"></div>
          <div class="demo-icon input-icon icon-date" title="date"></div>
          <div class="demo-icon input-icon icon-time" title="time"></div>
          <div
            class="demo-icon input-icon icon-hourglass"
            title="hourglass"
          ></div>
          <div
            class="demo-icon input-icon icon-hamburger"
            title="hamburger"
          ></div>
        </div>
        <div class="demo-inline">
          <div
            class="demo-icon input-icon icon-checkbox"
            title="check off"
          ></div>
          <div
            class="demo-icon input-icon icon-checkbox checked"
            title="check on"
          ></div>
          <div class="demo-icon input-icon icon-radio" title="radio off"></div>
          <div
            class="demo-icon input-icon icon-radio checked"
            title="radio on"
          ></div>
          <div class="demo-icon input-icon icon-star" title="star off"></div>
          <div
            class="demo-icon input-icon icon-star checked"
            title="star on"
          ></div>
        </div>
        <div class="demo-inline">
          <div
            class="demo-icon input-icon icon-arrow-up"
            title="up arrow"
          ></div>
          <div
            class="demo-icon input-icon icon-arrow-down"
            title="down arrow"
          ></div>
          <div
            class="demo-icon input-icon icon-arrow-left"
            title="left arrow"
          ></div>
          <div
            class="demo-icon input-icon icon-arrow-right"
            title="right arrow"
          ></div>
          <div class="demo-icon input-icon icon-nav-first" title="first"></div>
          <div
            class="demo-icon input-icon icon-nav-previous"
            title="fprevious"
          ></div>
          <div class="demo-icon input-icon icon-nav-next" title="fnext"></div>
          <div class="demo-icon input-icon icon-nav-last" title="last"></div>
          <div
            class="demo-icon input-icon icon-previous"
            title="previous"
          ></div>
          <div class="demo-icon input-icon icon-next" title="next"></div>
          <div
            class="demo-icon input-icon icon-triangle-up"
            title="triangle up"
          ></div>
          <div
            class="demo-icon input-icon icon-triangle-down"
            title="triangle down"
          ></div>
        </div>
        <div class="demo-inline">
          <div
            class="demo-icon input-icon icon-circle-ellipsis"
            title="circle ellipsis"
          ></div>
          <div
            class="demo-icon input-icon icon-circle-attach"
            title="circle attachment"
          ></div>
          <div
            class="demo-icon input-icon icon-circle-check"
            title="circle check"
          ></div>
          <div
            class="demo-icon input-icon icon-circle-cross"
            title="circle cross"
          ></div>
          <div
            class="demo-icon input-icon icon-circle-info"
            title="circle info"
          ></div>
          <div
            class="demo-icon input-icon icon-circle-error"
            title="circle error"
          ></div>
          <div
            class="demo-icon input-icon icon-circle-plus"
            title="circle plus"
          ></div>
          <div
            class="demo-icon input-icon icon-circle-minus"
            title="circle minus"
          ></div>
          <!-- div
            class="demo-icon input-icon icon-circle-split"
            title="circle split"
          ></div>
          <div
            class="demo-icon input-icon icon-circle-join"
            title="circle join"
          ></div>
          <div
            class="demo-icon input-icon icon-circle-refresh"
            title="circle refresh"
          ></div -->
        </div>
        <div class="demo-inline">
          <div
            class="demo-icon input-icon input-led led-grey"
            title="grey led"
          ></div>
          <div
            class="demo-icon input-icon input-led led-green"
            title="green led"
          ></div>
          <div
            class="demo-icon input-icon input-led led-red"
            title="red led"
          ></div>
          <div
            class="demo-icon input-icon input-led led-yellow"
            title="yellow led"
          ></div>
          <div
            class="demo-icon input-icon input-led led-violet"
            title="violet led"
          ></div>
          <div
            class="demo-icon input-icon input-led led-blue"
            title="blue led"
          ></div>
          <div
            class="demo-icon input-icon input-led led-orange"
            title="orange led"
          ></div>
        </div>
      </div>

      <div class="demo-title">Checkboxes</div>
      <!-- div class="row demo-row">
<div class="demo-inline"><?php echo renderToggle('togtest', 'togtest_sm', 'input-sm', 'Small'); ?></div>
<div class="demo-inline"><?php echo renderToggle('togtest', 'togtest', '', 'Normal', 'checkbox', 'checked=1'); ?></div>
<div class="demo-inline"><?php echo renderToggle('togtest', 'togtest_lg', 'input-lg', 'Large'); ?></div>
<div class="demo-inline"><?php echo renderToggle('togtest', 'togtest_dis', '', 'Disabled', 'checkbox', 'disabled=1'); ?></div>
<div class="demo-inline">
	<div class="input-toggle readonly checked">
		<label class="input-label text-label">
			<div class="switch"></div>
			Read-only
		</label>
	</div>
</div>
</div -->
      <div class="row demo-row">
        <div class="demo-inline">
          <div class="input-check">
            <input type="checkbox" id="checktest" /><label for="checktest"
              >{{ ' ' }}Checkbox</label
            >
          </div>
        </div>
        <!-- div class="demo-inline"><?php echo renderCheck('checktest', 'checktest_sm', 'small', 'Small'); ?></div>
<div class="demo-inline"><?php echo renderCheck('checktest', 'checktest', '', 'Normal', 'checkbox', 'checked=1'); ?></div>
<div class="demo-inline"><?php echo renderCheck('checktest', 'checktest_lg', 'large', 'Large'); ?></div>
<div class="demo-inline"><?php echo renderCheck('checktest', 'checktest_dis', '', 'Disabled', 'checkbox', 'disabled=1'); ?></div>
<div class="demo-inline"><?php echo renderCheck('checktest', 'checktest_dis', 'input-button', 'Button', 'checkbox'); ?></div>
<div class="demo-inline"><?php echo renderCheck('checktest', 'checktest_dis', 'input-field', 'Field', 'checkbox'); ?></div -->
      </div>

      <!-- div class="demo-title">
	Radio inputs
</div>
<div class="row demo-row">
<div class="demo-inline"><?php echo renderToggle('radiotest', 'radiotest_sm', 'input-sm', 'Small', 'radio'); ?></div>
<div class="demo-inline"><?php echo renderToggle('radiotest', 'radiotest', '', 'Normal', 'radio', 'checked=1'); ?></div>
<div class="demo-inline"><?php echo renderToggle('radiotest', 'radiotest_lg', 'input-lg', 'Large', 'radio'); ?></div>
</div>
<div class="row demo-row">
<div class="demo-inline"><?php echo renderCheck('radiotest', 'radiotest_sm', 'small', 'Small', 'radio'); ?></div>
<div class="demo-inline"><?php echo renderCheck('radiotest', 'radiotest', '', 'Normal', 'radio', 'checked=1'); ?></div>
<div class="demo-inline"><?php echo renderCheck('radiotest', 'radiotest_lg', 'large', 'Large', 'radio'); ?></div>
<div class="demo-inline"><?php echo renderCheck('radiotest', 'radiotest_dis', '', 'Disabled', 'radio', 'disabled=1'); ?></div>
<div class="demo-inline"><?php echo renderCheck('radiotest', 'radiotest_dis', 'input-button', 'Button', 'radio'); ?></div>
<div class="demo-inline"><?php echo renderCheck('radiotest', 'radiotest_dis', 'input-field', 'Field', 'radio'); ?></div>
</div -->

      <div class="demo-title">Text inputs</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <of-text-field
            class="of--small"
            value="Small text input"
            style="width: 10em"
          />
        </div>
        <div class="demo-inline">
          <of-text-field value="Normal text input" style="width: 10em" />
        </div>
        <div class="demo-inline">
          <of-text-field
            class="of--large"
            value="Large text input"
            style="width: 10em"
          />
        </div>
        <div class="demo-inline">
          <of-text-field
            readonly="1"
            value="Read-only text"
            style="width: 10em"
          />
        </div>
        <div class="demo-inline">
          <of-text-field
            disabled="1"
            value="Disabled text"
            style="width: 10em"
          />
        </div>
        <div class="demo-inline">
          <of-text-field placeholder="Placeholder" style="width: 10em" />
        </div>
        <div class="demo-inline">
          <of-text-field
            class="input-compact"
            style="width: 10em"
            value="Compact"
          />
        </div>
      </div>
      <div class="row demo-row">
        <div class="demo-inline">
          <of-textarea
            class="of--small"
            style="width: 10em"
            value="Small text area"
          />
        </div>
        <div class="demo-inline">
          <of-textarea style="width: 10em" value="Normal text area" />
        </div>
        <div class="demo-inline">
          <of-textarea
            class="of--large"
            style="width: 10em"
            value="Large text area"
          />
        </div>
        <div class="demo-inline">
          <of-textarea
            readonly="1"
            style="width: 10em"
            value="Read-only text area"
          />
        </div>
        <div class="demo-inline">
          <of-textarea
            disabled="1"
            style="width: 10em"
            value="Disabled text area"
          />
        </div>
      </div>

      <div class="demo-title">Button inputs</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <button type="button" class="input-button input-sm">
            <span class="input-label">Small button</span>
          </button>
        </div>
        <div class="demo-inline">
          <button type="button" class="input-button">
            <span class="input-label">Normal button</span>
          </button>
        </div>
        <div class="demo-inline">
          <button type="button" class="input-button input-lg">
            <span class="input-label">Large button</span>
          </button>
        </div>
        <div class="demo-inline">
          <button type="button" class="input-button">
            <div class="input-icon icon-star left"></div>
            <span class="input-label">Icon button</span>
          </button>
        </div>
        <div class="demo-inline">
          <button type="button" class="input-button" disabled="1">
            <span class="input-label">Disabled button</span>
          </button>
        </div>
        <div class="demo-inline">
          <button class="input-button input-bullet" tabindex="0">
            <div class="input-label">Dropdown button</div>
          </button>
        </div>
        <div class="demo-inline">
          <a href="#" class="input-button" tabindex="0"
            ><div class="input-label">Link button</div></a
          >
        </div>
        <div class="demo-inline">
          <button type="button" class="input-button loading-test" tabindex="0">
            <div class="input-label">Loading button</div>
            <div class="wait-outer">
              <div class="wait-icon dynamic heavy">
                <div class="bar1"></div>
                <div class="bar2"></div>
                <div class="bar3"></div>
              </div>
            </div>
          </button>
        </div>
        <!-- div class="demo-inline">
	<button type="button" class="input-button glyph-test" tabindex="0">
		<span class="glyphicon glyphicon-plus"></span>
	</button>
</div -->
      </div>

      <div class="demo-title">Field inputs</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <div
            class="input-field input-bullet bullet-expand input-sm"
            tabindex="0"
          >
            <div class="input-label">Small expand</div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field input-bullet bullet-expand" tabindex="0">
            <div class="input-label">Normal expand</div>
          </div>
        </div>
        <div class="demo-inline">
          <div
            class="input-field input-bullet bullet-expand input-lg"
            tabindex="0"
          >
            <div class="input-label">Large expand</div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field input-bullet bullet-expand" tabindex="0">
            <div class="input-label">
              <div class="input-icon icon-gear left"></div>
              Expand with icon
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div
            class="input-field readonly input-bullet bullet-expand"
            tabindex="0"
          >
            <div class="input-label">Read-only expand</div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field input-bullet bullet-expand disabled">
            <div class="input-label">Disabled expand</div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field loading-test" tabindex="0">
            <div class="input-label">Loading field</div>
            <div class="wait-outer">
              <div class="wait-icon dynamic heavy">
                <div class="bar1"></div>
                <div class="bar2"></div>
                <div class="bar3"></div>
              </div>
            </div>
          </div>
        </div>
        <!-- div class="demo-inline">
          <div class="input-field input-bullet bullet-expand muted" tabindex="0">
            <div class="input-label">Muted expand</div>
          </div>
        </div -->
        <div class="demo-inline">
          <div class="input-field input-bullet bullet-expand flat" tabindex="0">
            <div class="input-label">Flat expand</div>
          </div>
        </div>
      </div>

      <div class="demo-title">Long-text fields</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <div
            class="input-field input-bullet bullet-expand"
            style="max-width: 15em"
            tabindex="0"
          >
            <div class="input-label single">
              Single line field with a long long long long long input
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div
            class="input-field input-bullet bullet-expand"
            style="max-width: 12em"
            tabindex="0"
          >
            <div class="input-label limit-height">
              Multi-line field limited to 3 lines which goes on and on here's
              some more text etc etc etc etc
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div
            class="input-field input-bullet bullet-expand"
            style="max-width: 12em"
            tabindex="0"
          >
            <div class="input-label">
              <div class="input-icon theme-icon module-Cases left"></div>
              Multi-line field with an inline icon that goes on and on here's
              some more text etc etc etc etc
            </div>
          </div>
        </div>
        <!-- div class="demo-inline">
	<div class="input-field input-field-group input-bullet bullet-expand" style="max-width: 9em" tabindex="0">
		<div class="input-label input-field-icon"><div class="input-icon theme-icon module-Cases"></div></div>
		<div class="input-label">Multi line text with a separated icon
			<?php echo renderToggle('checkinl', 'checkinl', 'input-sm', ''); ?>
		</div>
	</div>
</div -->
      </div>

      <div class="demo-title">Tag inputs</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <div class="input-field state-alert input-sm">
            <div class="input-label">Inline</div>
          </div>
          {{ ' ' }}
          <div class="input-field input-field-group state-final">
            <div class="input-label">Tags</div>
            <div class="input-remove"></div>
          </div>
          {{ ' ' }}
          <div class="input-field state-danger input-lg input-bullet">
            <div class="input-label">Test</div>
          </div>
          {{ ' ' }}
          <div class="input-field state-invert input-bullet">
            <div class="input-label">Test</div>
          </div>
        </div>
        <div class="demo-inline">
          <div
            class="input-field input-bullet bullet-expand input-sm"
            tabindex="0"
          >
            <div class="input-flow-content input-sm">
              <div class="input-field input-field-group state-label">
                <div class="input-label">Small</div>
                <div class="input-remove input-bullet bullet-cancel"></div>
              </div>
              <div class="input-field input-field-group state-label">
                <div class="input-label">Tags</div>
                <div class="input-remove input-bullet bullet-cancel"></div>
              </div>
              <div class="input-field input-field-group state-label">
                <div class="input-label">List</div>
                <div class="input-remove input-bullet bullet-cancel"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field" style="max-width: 15em" tabindex="0">
            <div class="input-flow-content">
              <div class="input-field state-special">
                <div class="input-label">CSS</div>
              </div>
              <div class="input-field input-field-group state-success">
                <div class="input-label">JavaScript</div>
                <div class="input-remove input-bullet bullet-cancel"></div>
              </div>
              <div class="input-field state-warning">
                <div class="input-label">PHP</div>
              </div>
              <div class="input-field state-active">
                <div class="input-label">Docker</div>
              </div>
              <div class="input-field state-label">
                <div class="input-label">OpenShift</div>
              </div>
              <div class="input-field state-info">
                <div class="input-label">Perl</div>
              </div>
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div
            class="input-field input-bullet bullet-expand input-lg"
            tabindex="0"
          >
            <div class="input-flow-content input-lg">
              <div class="input-field state-label">
                <div class="input-label">Large</div>
              </div>
              <div class="input-field state-label">
                <div class="input-label">Tags</div>
              </div>
              <div class="input-field state-label">
                <div class="input-label">List</div>
              </div>
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div
            class="input-field-group input-field input-bullet bullet-expand disabled"
          >
            <div class="input-flow-content">
              <div class="input-field state-success">
                <div class="input-label">Disabled</div>
              </div>
              <div class="input-field state-label">
                <div class="input-label">Tags</div>
              </div>
              <div class="input-field state-label">
                <div class="input-label">List</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-title">Input groups</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <div class="input-field input-field-group">
            <div class="input-label input-addon state-label">
              <div class="input-icon icon-gear"></div>
            </div>
            <label class="input-label input-addon state-label" for="cell-group"
              >Label</label
            >
            <div
              class="input-field input-bullet bullet-expand border-left"
              id="cell-group"
              tabindex="0"
              style="max-width: 10em"
            >
              <div class="input-label">Expand field over multiple lines</div>
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field input-field-group">
            <label class="input-label state-label input-addon" for="group-text"
              >Input label</label
            >
            <input
              class="of-text-field border-left"
              value="Text input"
              id="group-text"
            />
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field input-field-group">
            <label
              class="input-label state-label input-addon"
              for="group-expand-field"
              >Input label</label
            >
            <div
              class="input-field input-bullet bullet-expand border-left"
              id="group-expand-field"
            >
              <div class="input-label">Expand field</div>
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field input-field-group">
            <label
              class="input-label state-label input-addon"
              for="group-dropdown-button"
              >Input label</label
            >
            <button
              class="input-button input-bullet border-left"
              id="group-dropdown-button"
            >
              <div class="input-label">Dropdown button</div>
            </button>
          </div>
        </div>
      </div>
      <div class="row demo-row">
        <div class="demo-inline">
          <div class="input-button-group">
            <div class="input-button" tabindex="0">
              <div class="input-label">Sample</div>
            </div>
            <div class="input-button" tabindex="0">
              <div class="input-label">Button</div>
            </div>
            <div class="input-button" tabindex="0">
              <div class="input-label">Group</div>
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-button-group">
            <div class="input-button input-bullet" tabindex="0">
              <div class="input-label">Dropdown</div>
            </div>
            <div class="input-button input-bullet bullet-alt-menu" tabindex="0">
              <div class="input-label">Button</div>
            </div>
            <div
              class="input-button input-bullet bullet-expand-down"
              tabindex="0"
            >
              <div class="input-label">Group</div>
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-button-group nav-button-group muted">
            <button
              type="button"
              title="Start"
              class="input-button nav-button"
              disabled="disabled"
            >
              <i class="input-icon icon-nav-first off"></i>
            </button>
            <button
              type="button"
              title="Previous"
              class="input-button nav-button"
              disabled="disabled"
            >
              <i class="input-icon icon-nav-previous off"></i>
            </button>
            <button
              type="button"
              class="input-button nav-button bar-insert input-bullet bullet-expand"
            >
              <span class="input-label">1–19 of 19</span>
            </button>
            <button type="button" title="Next" class="input-button nav-button">
              <i class="input-icon icon-nav-next off"></i>
            </button>
            <button type="button" title="End" class="input-button nav-button">
              <i class="input-icon icon-nav-last off"></i>
            </button>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field-group">
            <div class="input-field state-final" tabindex="0">
              <div class="input-label">Sample</div>
            </div>
            <div class="input-field state-info" tabindex="0">
              <div class="input-label">Tag</div>
            </div>
            <div class="input-field state-danger" tabindex="0">
              <div class="input-label">Group</div>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-title">Progress inputs</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <div
            class="input-field input-progress-outer input-sm state-success"
            style="width: 10em"
          >
            <div class="input-progress">
              <div class="input-progress-bar state-active" style="width: 50%">
                <label>50<small>%</small></label>
              </div>
              <div
                class="input-progress-bar state-final"
                style="width: 30%"
              ></div>
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field input-field-group input-success">
            <input
              type="text"
              class="of-text-field text-right"
              size="3"
              value="50"
            />
            <div class="input-label small border-right">%</div>
            <div class="input-field input-progress-outer" style="width: 15em">
              <div class="input-progress">
                <div
                  class="input-progress-bar state-disabled"
                  style="width: 50%"
                ></div>
                <div class="input-progress-bar empty"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div
            class="input-field input-progress-outer input-lg"
            style="width: 15em"
          >
            <div class="input-progress">
              <div class="input-progress-bar state-alert" style="width: 30%">
                <label>30<small>%</small></label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-title">File inputs</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <input type="file" class="input-field input-file" />
        </div>
        <div class="demo-inline">
          <div class="input-fileset">
            <input type="file" id="fileset" class="input-file" />
            <label for="fileset" class="input-field input-bullet bullet-expand">
              <div class="input-label">
                <span class="input-icon icon-attach left"></span>
                <span class="input-placeholder">{{ ' ' }}Select a file</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div class="demo-title">Multi select</div>
      <div class="row demo-row">
        <div class="demo-inline">
          <div
            class="input-field input-field-group input-bullet bullet-expand"
            id="multisel-blank"
            tabindex="0"
            style="width: 10em"
          >
            <div class="input-label input-placeholder">(placeholder)</div>
          </div>
          <div style="text-align: right; padding-right: 5px; margin-top: -1px">
            <div
              class="card-outer card-inline panel-outer panel-border panel-default popup-default flat-top hover-tools active"
            >
              <div class="panel-header">
                <div class="tools-row">
                  <span
                    class="input-icon icon-search uii-lg active-icon"
                  ></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field input-sm" id="multisel-head" tabindex="0">
            <section
              class="input-scroll menu-outer"
              style="width: 150px; height: 100px"
            >
              <p class="menu-option" tabindex="0">Small menu</p>
              <p class="menu-option" tabindex="0">Small menu</p>
              <p class="menu-option" tabindex="0">Small menu</p>
              <p class="menu-option drag-indicator"></p>
            </section>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field" id="multisel" tabindex="0">
            <section
              class="input-scroll menu-outer"
              style="width: 200px; height: 100px"
            >
              <div class="menu-header">Teams</div>
              <div class="menu-option input-label single" tabindex="0">
                <div
                  class="input-icon theme-icon module-SecurityGroups left"
                ></div>
                Team 1
              </div>
              <div class="menu-option input-label single" tabindex="0">
                <div
                  class="input-icon theme-icon module-SecurityGroups left"
                ></div>
                Team 2
              </div>
              <div class="menu-option input-label single" tabindex="0">
                <div
                  class="input-icon theme-icon module-SecurityGroups left"
                ></div>
                Team 3
              </div>
              <div class="menu-option input-label single" tabindex="0">
                <div
                  class="input-icon theme-icon module-SecurityGroups left"
                ></div>
                Team 4
              </div>
              <div class="menu-option input-label single" tabindex="0">
                <div
                  class="input-icon theme-icon module-SecurityGroups left"
                ></div>
                Team 5
              </div>
              <div class="menu-option input-label single" tabindex="0">
                <div
                  class="input-icon theme-icon module-SecurityGroups left"
                ></div>
                Team 6
              </div>
              <div class="menu-option input-label single" tabindex="0">
                <div
                  class="input-icon theme-icon module-SecurityGroups left"
                ></div>
                Team 7
              </div>
            </section>
          </div>
        </div>
        <div class="demo-inline">
          <div class="input-field input-lg" id="multisel-head" tabindex="0">
            <section class="input-scroll menu-outer" style="width: 150px">
              <p class="menu-option" tabindex="0">Large menu</p>
              <p class="menu-option" tabindex="0">Large menu</p>
            </section>
          </div>
        </div>
      </div>
      <div class="row demo-row">
        <div class="demo-inline">
          <div class="input-field input-field-group" id="to_addrs" tabindex="0">
            <label class="input-label input-addon" style="min-width: 3em"
              >To:</label
            >
            <div class="input-flow-content border-left" style="width: 450px">
              <div class="input-field input-bullet bullet-expand state-info">
                <div class="input-label">
                  Andrew Whitehead{{ ' ' }}
                  <span class="text-muted">&lt;andrew@1crm.com&gt;</span>
                </div>
              </div>
            </div>
            <div class="input-label input-addon">
              <button class="input-button">
                <i class="input-icon icon-circle-plus"></i> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({})
</script>

<style lang="scss" scoped>
.demo-block {
  background: #eee;
  border-radius: 5px;
}
.demo-block .card-popup {
  position: static;
}
.demo-title {
  margin: 10px;
  padding-top: 5px;
  padding-left: 5px;
  color: var(--color-disabled);
  font-weight: 500;
  font-size: var(--font-size-large);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  text-transform: lowercase;
  border-bottom: 1px solid #d6d6d6;
}
.demo-row {
  padding: 5px 25px 15px 25px;
  overflow: hidden;
}
.demo-inline {
  // vertical-align: middle;
  margin-bottom: 10px;
  margin-right: 10px;
  &:last-child {
    margin-right: 0;
    margin-bottom: 0;
  }
  display: inline-block;
  .header & {
    border: 1px solid #ddd;
  }
}
.form-cell.demo-cell,
.hl-form-cells .form-cell {
  box-shadow: inset 0 0 0 1px rgba(0, 60, 180, 0.2);
}

.demo-icon {
  // &:extend(.uii);
  box-sizing: content-box;
  display: inline-block;
  border-radius: 2px;
  font-size: 28px;
  line-height: 28px;
  border: 1px solid #eee;
  background: #fffefd;
  color: #444;
  box-shadow: 0 1px 0 #ccc;
  cursor: default;
  text-align: center;
  &:hover {
    color: #111;
  }
}

.loading-test {
  .wait-outer {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    .wait-icon {
      margin: 0 auto;
    }
  }
  &:hover {
    .wait-outer {
      display: flex;
      align-items: center;
    }
    color: var(--color-disabled);
    border-color: var(--border-color-disabled);
    background: var(--bg-button-disabled);
  }
  &.panel-loading {
    > * {
      transition: opacity 0.2s ease;
    }
  }
  &.panel-loading:not(:hover) {
    > .panel-header,
    > .panel-subheader,
    > .panel-body,
    > .panel-footer {
      opacity: initial;
    }
  }
}
</style>
