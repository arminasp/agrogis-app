Ext.define('map_app.view.JobContainer', {
    extend: 'Ext.Container',
    alias: 'widget.jobcontainer',

    requires: [
        'Ext.field.DatePicker',
        'Ext.picker.Date',
        'Ext.field.Toggle',
        'Ext.field.Select',
        'Ext.Button'
    ],

    itemId: 'jobCont',
    padding: 10,
    scrollable: 'vertical',

    initConfig: function(instanceConfig) {
        var me = this,
            config = {
                items: [
                    me.processJobDatePicker({
                        xtype: 'datepickerfield',
                        itemId: 'jobDatePicker',
                        padding: 10,
                        name: 'date',
                        value: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
                        usePicker: true,
                        dateFormat: 'Y-m-d',
                        picker: {
                            slotOrder: [
                                'year',
                                'month',
                                'day'
                            ]
                        }
                    }),
                    me.processGpsToggle({
                        xtype: 'togglefield',
                        itemId: 'gpsToggle',
                        padding: 10
                    }),
                    {
                        xtype: 'container',
                        height: 200,
                        hidden: true,
                        itemId: 'gpsCont',
                        padding: 10,
                        layout: 'fit'
                    },
                    {
                        xtype: 'container',
                        hidden: true,
                        itemId: 'serviceCont',
                        layout: 'hbox',
                        items: [
                            me.processServiceToggle({
                                xtype: 'togglefield',
                                flex: 1,
                                itemId: 'serviceToggle',
                                padding: 10
                            }),
                            me.processServiceCompanySelectField({
                                xtype: 'selectfield',
                                flex: 3,
                                hidden: true,
                                itemId: 'serviceCompanySelectField',
                                padding: 10,
                                usePicker: true,
                                autoSelect: false,
                                displayField: 'field2',
                                valueField: 'field1'
                            })
                        ]
                    },
                    me.processJobSelectField({
                        xtype: 'selectfield',
                        itemId: 'jobSelectField',
                        padding: 10,
                        name: 'job',
                        usePicker: true,
                        autoSelect: false,
                        displayField: 'name',
                        store: 'JobsStore',
                        valueField: 'id'
                    }),
                    me.processFieldSelectField({
                        xtype: 'selectfield',
                        itemId: 'fieldSelectField',
                        padding: 10,
                        usePicker: true,
                        autoSelect: false,
                        displayField: 'field_code',
                        valueField: 'field_id'
                    }),
                    {
                        xtype: 'container',
                        itemId: 'resourceCont'
                    },
                    me.processJobSaveButton({
                        xtype: 'button',
                        hidden: true,
                        itemId: 'jobSaveButton',
                        ui: 'confirm',
                        width: '100%',
                        padding: 10
                    })
                ]
            };
        if (instanceConfig) {
            me.self.getConfigurator().merge(me, config, instanceConfig);
        }
        return me.callParent([config]);
    },

    processJobDatePicker: function(config) {
        config.label = appInfo.msg.label.date;
        return config;
    },

    processGpsToggle: function(config) {
        config.label = appInfo.msg.label.gps;
        return config;
    },

    processServiceToggle: function(config) {
        config.label = appInfo.msg.label.service;
        return config;
    },

    processServiceCompanySelectField: function(config) {
        config.label = appInfo.msg.hint.selectServiceCompany;
        config.placeHolder = appInfo.msg.common.pleaseSelect;
        return config;
    },

    processJobSelectField: function(config) {
        config.label = appInfo.msg.label.job;
        config.placeHolder = appInfo.msg.common.pleaseSelect;
        return config;
    },

    processFieldSelectField: function(config) {
        config.label = appInfo.msg.label.field;
        config.placeHolder = appInfo.msg.common.pleaseSelect;
        return config;
    },

    processJobSaveButton: function(config) {
        config.text = appInfo.msg.common.save;
        return config;
    }
});