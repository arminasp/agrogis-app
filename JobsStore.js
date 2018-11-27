Ext.define('map_app.store.JobsStore', {
    extend: 'Ext.data.Store',

    requires: [
        'map_app.model.JobModel',
        'Ext.data.proxy.Ajax',
        'Ext.data.reader.Json'
    ],

    constructor: function(cfg) {
        var me = this;
        cfg = cfg || {};
        me.callParent([Ext.apply({
            pageSize: 0,
            storeId: 'JobsStore',
            autoLoad: true,
            model: 'map_app.model.JobModel',
            proxy: {
                type: 'ajax',
                url: '/maps-system/services/rest/jobs/read',
                reader: {
                    type: 'json',
                    messageProperty: 'message',
                    rootProperty: 'rows'
                }
            }
        }, cfg)]);
    }
});