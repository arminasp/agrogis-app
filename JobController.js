Ext.define('map_app.controller.JobController', {
    extend: 'Ext.app.Controller',

    refs: {
        resourceCont: '#resourceCont',
        jobSaveButton: '#jobSaveButton',
        jobSelectField: 'selectfield#jobSelectField',
        fieldSelectField: 'selectfield#fieldSelectField',
        gpsToggle: 'togglefield#gpsToggle',
        gpsCont: 'container#gpsCont',
        jobDatePicker: 'datepickerfield#jobDatePicker',
        serviceCont: 'container#serviceCont',
        serviceToggle: 'togglefield#serviceToggle',
        serviceCompanySelectField: 'selectfield#serviceCompanySelectField'
    },

    control: {
        "container#jobCont": {
            show: 'onJobContShow'
        },
        "#jobSelectField": {
            change: 'onJobSelectFieldChange'
        },
        "selectfield#fieldSelectField": {
            change: 'onFieldSelectFieldChange'
        },
        "datepickerfield#jobDatePicker": {
            change: 'onJobDatePickerChange'
        },
        "togglefield#gpsToggle": {
            change: 'onGpsToggleChange'
        },
        "togglefield#serviceToggle": {
            change: 'onServiceToggleChange'
        },
        "button#jobSaveButton": {
            tap: 'onJobSaveButtonTap'
        }
    },

    onJobContShow: function(component, eOpts) {
        if (!this.getFieldSelectField().getStore()) {
            this.getFieldSelectField().setStore(appInfo.stores.field);
            this.getFieldSelectField().fullStore = appInfo.stores.field;
        }
    },

    onJobSelectFieldChange: function(selectfield, newValue, oldValue, eOpts) {
        var that = this;

        Ext.Ajax.request({
            url: '/maps-system/services/rest/jobs/' + newValue.id + '/fact-resource-groups/read',
            success: function (response, opts) {
                var result = Ext.decode(response.responseText);

                if (result.success) {
                    var resourceCont = that.getResourceCont();
                    var resources = result.rows;
                    var resGroups = [];

                    that.vehicleField = null;
                    that.timeField = null;
                    resourceCont.removeAll(true);

                    Ext.Array.forEach(resources, function(resource) {
                        var selectField = map_app.controller.Resource.getSelectField(resource.group.name, resource.group.sysType);
                        var resGroup = {
                            resourceGroupId: resource.group.id,
                            resources: [
                                {
                                    resourceId: null,
                                    values: {}
                                }
                            ]
                        };

                        resourceCont.add(map_app.controller.Resource.getLine());

                        if (resource.group.sysType === 'VEHICLE') {
                            that.setGroupResources(selectField, resource.group.id, true);
                            that.vehicleField = selectField;
                        } else {
                            that.setGroupResources(selectField, resource.group.id);
                        }

                        resourceCont.add(selectField);

                        Ext.Array.forEach(resource.attrs, function(attribute) {
                            var formField = null;
                            resGroup.resources[0].values[attribute.id] = null;

                            if (attribute.sysType === 'PROCESSED_HOURS') {
                                formField = map_app.controller.Resource.getTimeField(attribute.name, attribute.id);
                                that.timeField = formField;
                            } else {
                                formField = map_app.controller.Resource.getSpinnerField(attribute.name, attribute.id);
                            }

                            if (formField) {
                                resourceCont.add(formField);
                            }
                        });

                        resGroups.push(resGroup);
                    });

                    if (that.getGpsToggle().getValue()) {
                        that.setGpsMode(true);
                    }

                    that.resourceGroups = resGroups;
                    that.getJobSaveButton().show();
                }
            }
        });
    },

    onFieldSelectFieldChange: function(selectfield, newValue, oldValue, eOpts) {
        if (this.getGpsToggle().getValue()) {
            this.setGpsMode(true);
        }
    },

    onJobDatePickerChange: function(datepickerfield, newDate, oldDate, eOpts) {
        var gpsToggle = this.getGpsToggle();

        if (gpsToggle && gpsToggle.getValue()) {
            this.loadGps();
        }
    },

    onGpsToggleChange: function(togglefield, newValue, oldValue, eOpts) {
        if (newValue) {
            this.setGpsMode(true);
            this.loadGps();
        } else {
            this.setGpsMode(false);
        }
    },

    onServiceToggleChange: function(togglefield, newValue, oldValue, eOpts) {
        var serviceCompanySelectField = this.getServiceCompanySelectField();

        if (newValue) {
            if (!serviceCompanySelectField.getStore()) {
                var companies = [];

                appInfo.stores.company.each(function(company) {
                    if (company.get('field1') !== appInfo.sessionInfo.activeCompany.id) {
                        companies.push(company.copy());
                    }
                });

                serviceCompanySelectField.setStore(new Ext.data.Store({
                    data: companies
                }));
            }
            serviceCompanySelectField.show();
        } else {
            serviceCompanySelectField.hide();
        }
    },

    onJobSaveButtonTap: function(button, e, eOpts) {
        map_app.controller.Util.setLoading(true);
        var that = this;
        var fieldSelectField = that.getFieldSelectField();

        if (!fieldSelectField.getValue()) {
            map_app.controller.Util.setLoading(false);
            fieldSelectField.addCls('x-invalid');
            map_app.controller.Util.alert(appInfo.msg.alert.fieldNotSelected, 3000);
        } else {
            var resources = that.getResourceCont().getItems().items;
            var isMissing = false;

            Ext.Array.forEach(resources, function(resource) {
                if ((resource.type !== 'line') && (resource.getValue() === null)) {
                    isMissing = true;
                    resource.addCls('x-invalid');
                }
            });

            if (isMissing) {
                map_app.controller.Util.setLoading(false);
                map_app.controller.Util.alert(appInfo.msg.alert.missingFields, 3000);
                return;
            }

            var resourceGroups = that.resourceGroups;
            var lastGroupId = null;

            Ext.Array.forEach(resources, function(resource) {
                if (resource.type !== 'line') {
                    if (resource.groupId !== undefined) {
                        Ext.each(resourceGroups, function(resGroup) {
                            if (resGroup.resourceGroupId === resource.groupId) {
                                lastGroupId = resource.groupId;
                                resGroup.resources[0].resourceId = resource.getValue();
                                return false;
                            }
                        });
                    } else if (resource.attrId !== undefined) {
                        Ext.each(resourceGroups, function(resGroup) {
                            if (resGroup.resourceGroupId === lastGroupId) {
                                if (resource.type === 'timefield') {
                                    var date = new Date('2008-01-01 ' + resource.getValue());
                                    resGroup.resources[0].values[resource.attrId] = date.getTime();
                                } else {
                                    resGroup.resources[0].values[resource.attrId] = resource.getValue();
                                }
                                return false;
                            }
                        });
                    }
                }
            });

            var dfrWorkCard = new jQuery.Deferred();
            var newWorkCard = {
                "date": that.getJobDatePicker().getValue(),
                "jobId": that.getJobSelectField().getValue()
            };

            var job = null;

            if (that.currentVehicle) {
                Ext.each(that.currentVehicle.routes, function(route) {
                    if (route.field_id === fieldSelectField.getValue()) {
                        job = {
                            fieldId: fieldSelectField.getValue(),
                            routeIds: [route.OBJECTID],
                            withGps: true,
                            areaWithImplement: typeof route.area_w_implement === 'number' ? route.area_w_implement : null,
                            resourceGroups: resourceGroups
                        };
                        return false;
                    }
                });
            } else {
                job = {
                    fieldId: fieldSelectField.getValue(),
                    resourceGroups: resourceGroups
                };
            }

            Ext.Ajax.request({
                url: '/maps-system/services/rest/work-cards/create',
                method: 'POST',
                params: {
                    "rows": Ext.encode(newWorkCard),
                    "company_id": appInfo.sessionInfo.activeCompany.id,
                    "season_id": appInfo.seasonInfo.activeSeason.get('id')
                },
                success: function (response, opts) {
                    var result = Ext.decode(response.responseText);

                    if (result.success) {
                        that.workCard = result.rows[0];
                        dfrWorkCard.resolve(that.workCard);
                    } else {
                        map_app.controller.Util.alert(appInfo.msg.alert.jobSaveError);
                        map_app.controller.Util.setLoading(false);
                    }
                },
                failure: function (response, opts) {
                    map_app.controller.Util.setLoading(false);
                    map_app.controller.Util.alert(appInfo.msg.alert.jobSaveError);
                }
            });

            dfrWorkCard.then(function (workCard) {
                var serviceCompanyId = that.getServiceCompanySelectField().getValue();
                var isService = false;

                if (that.currentVehicle && that.getServiceToggle().getValue() && serviceCompanyId &&
                    (serviceCompanyId !== appInfo.sessionInfo.activeCompany.id)) {
                    var vehicleId = that.currentVehicle.vehicleResourceId;

                    Ext.Ajax.request({
                        url: '/maps-system/services/rest/gps-owner/' + serviceCompanyId + '/' +
                        appInfo.seasonInfo.activeSeason.get('name') + '/true',
                        method: 'GET',
                        async: false,
                        success: function (response, opts) {
                            var gpsInfo = Ext.decode(response.responseText);
                            gpsInfo.vehicleId = vehicleId;
                            gpsInfo.traktor = vehicleId;
                            job.paslaugosWorkCardId = workCard.paslaugosWorkCardId;
                            job.paslaugosVehicledId = gpsInfo;
                            isService = true;
                        }
                    });
                }

                var saveJob = function() {
                    Ext.Ajax.request({
                        url: '/maps-system/services/rest/work-cards/' + workCard.id + '/fields/create',
                        method: 'POST',
                        params: {
                            "rows": Ext.encode(job),
                            "company_id": appInfo.sessionInfo.activeCompany.id,
                            "season_id": appInfo.seasonInfo.activeSeason.get('id')
                        },
                        success: function (response, opts) {
                            var result = Ext.decode(response.responseText);
                            map_app.controller.Util.setLoading(false);

                            if (result.success) {
                                map_app.controller.Util.alert(appInfo.msg.alert.jobSaveSucc, 3000);
                            } else {
                                map_app.controller.Util.alert(appInfo.msg.alert.jobSaveError);
                            }
                        },
                        failure: function (response, opts) {
                            map_app.controller.Util.setLoading(false);
                            map_app.controller.Util.alert(appInfo.msg.alert.jobSaveError);
                        }
                    });
                };

                if (isService) {
                    map_app.controller.Util.confirm($.grep(appInfo.sessionInfo.allCompanies, function(obj){return obj.id === serviceCompanyId;})[0].name +
                                                    appInfo.msg.alert.service2 + appInfo.msg.alert.continue, saveJob, function() {
                                                        map_app.controller.Util.setLoading(false);
                                                    });
                } else {
                    saveJob();
                }
            });
        }

    },

    loadGps: function() {
        var that = this;
        var gpsCont = that.getGpsCont();
        var fieldSelectField = that.getFieldSelectField();

        var gpsCarousel = Ext.create('Ext.carousel.Carousel', {
            listeners: {
                activeitemchange: function(sender, value, oldValue, eOpts) {
                    if (value.vehicle) {
                        that.currentVehicle = value.vehicle;

                        if (!value.routes) {
                            Ext.Ajax.request({
                                url: appConfig.services.fieldsMapServiceUrl + '/' + appConfig.services.routesLyrId + '/query',
                                method: 'GET',
                                params: {
                                    'f': 'json',
                                    'where': 'vehicle_resource_id = ' + value.vehicle.vehicleResourceId +
                                    ' and season_id = ' + appInfo.seasonInfo.activeSeason.get('id') +
                                    ' and date_to < ' + this.dateTo +
                                    ' and date_from >= ' + this.dateFrom,
                                    'outFields': '*',
                                    'returnGeometry': false,
                                    'spatialRel': 'esriSpatialRelIntersects'
                                },
                                success: function (response, opts) {
                                    var features = Ext.decode(response.responseText).features;
                                    var routes = [];
                                    var downtime = {
                                        route: null,
                                        time: 0
                                    };

                                    features.reverse();

                                    Ext.Array.forEach(features, function(feature) {
                                        var attr = feature.attributes;

                                        if (attr.field_id !== null) {
                                            if (attr.field_code === null) {
                                                switch (attr.state) {
                                                    case 'Kelias':
                                                        attr.field_code = appInfo.msg.label.onRoad;
                                                        break;
                                                    case 'Kiti':
                                                        downtime.route = attr;
                                                        attr.field_code = appInfo.msg.label.downtime;
                                                        break;
                                                    default:
                                                        break;
                                                }
                                            }

                                            if (attr.field_code !== null) {
                                                routes.push(attr);
                                            } else {
                                                downtime.time += attr.time;
                                            }
                                        }
                                    });

                                    if (downtime.route) {
                                        downtime.route.time = downtime.time;
                                    }

                                    value.vehicle.routes = routes;

                                    fieldSelectField.setStore(Ext.create('Ext.data.Store', {
                                        data: routes
                                    }));

                                    if (routes.length > 0) {
                                        fieldSelectField.setValue(routes[0].field_id);
                                    }
                                }
                            });
                        } else {
                            fieldSelectField.setStore(Ext.create('Ext.data.Store', {
                                data: value.vehicle.routes
                            }));

                            if (value.vehicle.routes.length > 0) {
                                fieldSelectField.setValue(value.vehicle.routes[0].field_id);
                            }
                        }
                    }
                }
            }
        });

        var dateFrom = that.getJobDatePicker().getValue();
        var dateTo = new Date(dateFrom.getTime() + 24 * 60 * 60 * 1000);

        gpsCarousel.dateFrom = "'" + dateFrom.getFullYear() + '-' + (dateFrom.getMonth() + 1) + '-' + dateFrom.getDate() + "'";
        gpsCarousel.dateTo = "'" + dateTo.getFullYear() + '-' + (dateTo.getMonth() + 1) + '-' + dateTo.getDate() + "'";
        gpsCont.removeAll(true);

        Ext.Ajax.request({
            url: '/maps-system/services/rest/vehicles/read',
            method: 'GET',
            params: {
                date_from: dateFrom.getTime(),
                date_to: dateTo.getTime(),
                company_id: appInfo.sessionInfo.activeCompany.id,
                season_id: appInfo.seasonInfo.activeSeason.id
            },
            success: function (response, opts) {
                var vehicles = Ext.decode(response.responseText).rows;

                if (vehicles.length > 0) {
                    Ext.Array.forEach(vehicles, function(vehicle) {
                        gpsCarousel.add(Ext.create('Ext.Container', {
                            padding: 10,
                            vehicle: vehicle,
                            items: [
                                {
                                    xtype: 'button',
                                    width: '100%',
                                    disabled: true,
                                    padding: 10,
                                    text: vehicle.name
                                },
                                {
                                    xtype: 'button',
                                    width: '100%',
                                    disabled: true,
                                    padding: 10,
                                    text: Math.floor(vehicle.time) + ' h ' + Math.floor((vehicle.time - Math.floor(vehicle.time)) * 60) + ' min'
                                },
                                {
                                    xtype: 'button',
                                    width: '100%',
                                    disabled: true,
                                    padding: 10,
                                    text: Math.round(vehicle.distance * 100) / 100 + ' km'
                                }
                            ]
                        }));
                    });
                } else {
                    that.currentVehicle = null;
                    fieldSelectField.setStore(fieldSelectField.fullStore);
                    fieldSelectField.reset();

                    if (that.timeField) {
                        that.timeField.setValue('00:00');
                    }

                    gpsCarousel.add(Ext.create('Ext.Button', {
                        width: '100%',
                        disabled: true,
                        padding: 10,
                        margin: '-20 0 0 0',
                        text: appInfo.msg.label.noGps
                    }));
                }

                gpsCont.add(gpsCarousel);
            }
        });
    },

    setGroupResources: function(field, groupId, isAllCompanies) {
        var store = Ext.create('Ext.data.Store', {
            autoLoad: true,
            pageSize: 0,
            fields: ['id', 'name'],
            proxy: {
                type: 'ajax',
                api: {
                    read: '/maps-system/services/rest/resource-groups/' + groupId + '/resources/read'
                },
                extraParams: {
                    company_id: appInfo.sessionInfo.activeCompany.id
                },
                reader: {
                    type: 'json',
                    idProperty: 'id',
                    messageProperty: 'message',
                    rootProperty: 'rows'
                }
            }
        });

        if (isAllCompanies) {
            field.allCompaniesStore = Ext.create('Ext.data.Store', {
                autoLoad: true,
                pageSize: 0,
                fields: ['id', 'name'],
                proxy: {
                    type: 'ajax',
                    api: {
                        read: '/maps-system/services/rest/resource-groups/' + groupId + '/resources/read'
                    },
                    extraParams: {
                        company_id: appInfo.sessionInfo.activeCompany.id,
                        all_companies: true
                    },
                    reader: {
                        type: 'json',
                        idProperty: 'id',
                        messageProperty: 'message',
                        rootProperty: 'rows'
                    }
                }
            });

            field.companyStore = store;
        }

        field.groupId = groupId;
        field.setStore(store);
    },

    setGpsMode: function(status) {
        var that = this;

        if (status) {
            if (that.vehicleField) {
                if (!that.vehicleField.gpsOffLabel) {
                    var label = that.vehicleField.getLabel();
                    that.vehicleField.gpsOffLabel = label;
                    that.vehicleField.gpsOnLabel = label + ' (' + appInfo.msg.hint.selectGps + ')';
                }

                that.vehicleField.setLabel(that.vehicleField.gpsOnLabel);
                that.vehicleField.setReadOnly(true);
                that.vehicleField.setStore(that.vehicleField.allCompaniesStore);

                var vehicleInterval = setInterval(function() {
                    if (that.currentVehicle) {
                        var i = 0;

                        that.vehicleField.setValue(that.currentVehicle.vehicleResourceId);

                        if ((i++ >= 10) || (that.vehicleField.getValue() !== null)) {
                            clearInterval(vehicleInterval);
                        }
                    } else {
                        that.vehicleField.setValue(null);
                        clearInterval(vehicleInterval);
                    }
                }, 500);
            }

            if (that.timeField && that.currentVehicle) {
                var time = that.getRouteTime(that.currentVehicle.routes);

                if (time) {
                    that.timeField.setValue(time);
                }
            }

            that.getGpsCont().show();
            that.getServiceCont().show();
        } else {
            that.currentVehicle = null;

            if (that.vehicleField) {
                that.vehicleField.setLabel(that.vehicleField.gpsOffLabel);
                that.vehicleField.setReadOnly(false);
                that.vehicleField.setValue(null);
                that.vehicleField.setStore(that.vehicleField.companyStore);
            }

            if (that.timeField) {
                that.timeField.setValue('00:00');
            }

            var fieldSelectField = that.getFieldSelectField();
            fieldSelectField.setStore(fieldSelectField.fullStore);
            fieldSelectField.reset();

            that.getGpsCont().hide();
            that.getServiceCont().hide();
        }
    },

    getRouteTime: function(routes) {
        var fieldSelectField = this.getFieldSelectField();
        var timeInField = null;

        if (fieldSelectField.getValue()) {
            var currentFieldId = fieldSelectField.getValue();

            Ext.each(routes, function(field) {
                if (field.field_id === currentFieldId) {
                    var hours = Math.floor(field.time);
                    var minutes = Math.floor((field.time - Math.floor(field.time)) * 60);

                    if (hours < 10) {
                        hours = '0' + hours;
                    }

                    if (minutes < 10) {
                        minutes = '0' + minutes;
                    }

                    timeInField = hours + ':' + minutes;
                    return false;
                }
            });
        }

        return timeInField;
    }
});