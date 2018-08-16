// TODO User goups?
// ie. has read an ad, has visited railway station at 9 o'clock,
// customer of x, swipes most ads away
let myApp = {
config: {
// TODO anything here?



},
utils: {
 utils: function(filters = []) {
     this.filters = filters;
     // Returns true if filters are empty, or if idx represents filter
     this.inFilter = async function (data, idx)
     {
         for (let i = 0; i < this.filters.length; ++i) {
             let splt = this.filters[i].split(':');

             let group = await splt[0], opt = await splt[1];

             for (let j = 0; j < data.length; ++j) {

                 if (data[j][0].replace(/"/g, '') === group &&
                     data[j][idx].replace(/"/g, '') !== opt) {

                     return false;
                 }
             }
         }
         return true;
     };

     // return true if timestamp is between given dates
     this.inDateRange = function(timestamp, dateStart, dateEnd)
     {
         // Timestamp example: "2017-02-23 13:43:54.523"
         timestamp = timestamp.replace(/"/g, '');

         let y =  Number(timestamp.slice(0, 4));
         let m =  Number(timestamp.slice(5, 7)) - 1; // counting starts from zero
         let d =  Number(timestamp.slice(8, 10));
         let h =  Number(timestamp.slice(11, 13));
         let mn = Number(timestamp.slice(14, 16));

         let date = new Date(y, m, d, h, mn);

         if (date >= dateStart && date <= dateEnd) {
             return true;
         } else {
             return false;
         }
     };

     // Returns dataset and times sampled from arrays given, as arrays of length stepsize
     // Sums data from inside the step timeframe, so that graphs can be drawn,
     // since every event only counts as one.
     this.summarize = function(dataset, timearray, stepsize)
     {
         // create a array with both times and data, for sorting
         let timeseries = [];
         for (let i = 0; i < dataset.length; ++i ) {
            timeseries.push({x: timearray[i], y: dataset[i]});
         }

         // Sort arrays by time
         function compare(a, b) {
             return a.x > b.x;
         }
         timeseries = timeseries.sort(compare);

         let newtimes = [];
         let newdata = [];

         let timesum = 0;
         let sum = 0;

         let steps = 0;
         let last = timeseries[0].x;


         // Sum data from each timeframe
         for (let i = 0; i < timeseries.length; ++i) {
            if (timeseries[i].x - last < stepsize) {
                sum += timeseries[i].y;
                //timesum += timeseries[i].x;

                steps += 1;

            } else {
                newdata.push(sum);
                newtimes.push(timeseries[i].x);

                timesum = 0;
                sum = 0;
                steps = 0;

                last = timeseries[i].x;
            }
         }
         return [newdata, newtimes];
     }
 }
},
widgets: {
    map: function (mapContainer, locDataFile) {
        // HERE platform
        this.platform = new H.service.Platform({
            'app_id': 'XtqZUWaqb5ZVXMmJRjhC',
            'app_code': 'EFHR5Ai9IhbFSrV5Jop2Cw',
            'useCIT': true,
            'useHTTPS': true
        });

        this.locDataFile = locDataFile;

        // Obtain the default map types from the platform object:
        const defaultLayers = this.platform.createDefaultLayers();

        // Instantiate (and display) a map object:
        const map = new H.Map(
            mapContainer,
            defaultLayers.normal.map,
            {
                zoom: 13,
                center: {lat: 61.4954, lng: 23.7542}
            });

        // Create the default UI:
        this.ui = H.ui.UI.createDefault(map, defaultLayers);

        // Add map events functionality to the map
        const mapEvents = new H.mapevents.MapEvents(map);

        // Add behavior to the map: panning, zooming, dragging.
        const behavior = new H.mapevents.Behavior(mapEvents);

        this.map = map;

        // -------------------------------
        // ------ Heatmap Utilities ------
        // -------------------------------
        this.filters = [];

        this.drawHeatMap = async function (map, dateStart, dateEnd, provider) {
            const parser = new myApp.widgets.csvParser();
            let data = await parser.parseCSV(this.locDataFile);

            let lat = data[6];
            let lng = data[7];

            let timestamps = data[8];

            let heatmapProvider;
            if (provider == null) {

                // Create heat map provider
                heatmapProvider = new H.data.heatmap.Provider({
                    colors: new H.data.heatmap.Colors({
                        // light color version

                        '0': '#0431B4',
                        '0.1': '#0489B1',
                        '0.2': '#04B486',
                        '0.3': '#01DF3A',
                        '0.4': '#D7DF01',
                        '0.5': '#DBA901',
                        '0.55': '#DF7401',
                        '0.6': '#DF3A01',
                        '0.65': '#DF0101'

                        // dark color version
                        /*
                        '0':   '#086A87',
                        '0.1': '#088A4B',
                        '0.2': '#088A08',
                        '0.3': '#4B8A08',
                        '0.4': '#868A08',
                        '0.5': '#886A08',
                        '0.6': '#8A4B08',
                        '0.7': '#8A2908',
                        '0.8': '#8A0808'
                        */
                    }, true),
                    // Paint assumed values in regions where no data is available
                    assumeValues: true
                });

            } else {
                heatmapProvider = provider;
            }
            heatmapProvider.clear();

            // Objcet containing utility functions
            let utility = new myApp.utils.utils(this.filters);

            // Add the data
            let dataLen = 0;
            for (let i = 0; i < lat.length; ++i) {
                let latitude = Number(lat[i].replace(/"/g, ''));
                let longitude = Number(lng[i].replace(/"/g, ''));

                if (!isNaN(latitude) && !isNaN(longitude) &&
                    latitude !== 0 && longitude !== 0 &&
                    await utility.inFilter(data, i) &&
                    await utility.inDateRange(timestamps[i], dateStart, dateEnd)) {
                    heatmapProvider.addData(
                        [{lat: latitude, lng: longitude, value: 1}]
                    );
                    dataLen += 1;
                }
            }
            if (dataLen > 0) {
                // Create a semi-transparent heat map layer
                let heatmapLayer = new H.map.layer.TileLayer(heatmapProvider, {
                    opacity: 0.7
                });

                // Add the layer to the map
                await this.map.addLayer(heatmapLayer);
            }
            return heatmapProvider;
        };
    },
    dateSlider: function (sliderContainer, dateMin, dateMax) {
        this.dateStart = dateMin;
        this.dateEnd = dateMax;

        sliderContainer.dateRangeSlider({
            bounds: {
                min: this.dateStart,
                max: this.dateEnd
            },
            defaultValues: {
                min: this.dateStart,
                max: this.dateEnd
            },

            formatter: function (val) {
                let days = val.getDate(),
                    month = val.getMonth() + 1,
                    year = val.getFullYear();

                return days + "/" + month + "/" + year
            }
        });

        this.update = function (attribute, dateMin, dateMax) {
            if (attribute === "formatter") {
                function format(n) {
                    return n > 9 ? "" + n : "0" + n;
                }

                // if date difference < three days (in milliseconds), show hours and minutes
                if (dateMax - dateMin < 259200000) {
                    sliderContainer.dateRangeSlider("option", "formatter",
                        function (val) {
                            let date = new Date(val);

                            let minute = date.getMinutes(),
                                hour = date.getHours(),
                                days = date.getDate(),
                                month = date.getMonth() + 1,
                                year = date.getFullYear();

                            return format(days) + "/" + format(month) + "/" +
                                format(year) + " " +
                                format(hour) + ":" + format(minute);
                        });
                } else {
                    sliderContainer.dateRangeSlider("option", "formatter",
                        function (val) {
                            let date = new Date(val);

                            let days = date.getDate(),
                                month = date.getMonth() + 1,
                                year = date.getFullYear();

                            return format(days) + "/" + format(month) + "/" +
                                format(year);
                        });
                }
            }
            else {
                sliderContainer.dateRangeSlider(
                    attribute, dateMin, dateMax
                );
            }
        }
    },
    datePicker: function (datePickerContainer, minDate, maxDate) {
        this.minDate = minDate;
        this.maxDate = maxDate;

        $(function () {
            datePickerContainer.daterangepicker({

                timePicker: true,
                showDropdowns: true,
                timePicker24Hour: true,
                linkedCalendars: false,
                drops: 'up',

                startDate: minDate,
                endDate: maxDate,

                minDate: minDate,
                maxDate: maxDate,

                locale: {
                    format: 'YY/MM/DD HH:mm'
                }
            });
        });
    },
    filter: function (filterMenu, dataFile) {
        this.locDataFile = dataFile;

        // Option group == column in data file, ie. title, type, action...
        this.createOptionGroup = async function (name, data) {
            let optgroup = document.createElement("OPTGROUP");
            optgroup.setAttribute("label", name);

            let idx = 0;
            // find column with right attribute
            for (let i = 0; i < data.length; ++i) {
                if (data[i][0].replace(/"/g, '') === name) {
                    idx = i;
                    break;
                }
            }
            let added = [];
            for (let i = 0; i < data[idx].length; ++i) {
                let value = data[idx][i].replace(/"/g, '');

                if (!added.includes(value) && value !== name && value !== "") {
                    let option = document.createElement("OPTION");

                    // value == "group:option"
                    option.setAttribute("value", name + ":" + value);
                    option.innerHTML = value;

                    optgroup.append(option);
                    added.push(value);
                }
            }
            return optgroup;
        };

        // Option == value in selected column
        this.addOptions = async function (options, locDataFile) {
            const parser = new myApp.widgets.csvParser();
            let data = await parser.parseCSV(locDataFile);

            for (let i = 0; i < options.length; ++i) {
                let optgroup = await this.createOptionGroup(options[i], data);

                filterMenu.append(optgroup);
            }
        };

        // activate chosenjs
        $(function () {
            filterMenu.chosen({
                disable_search_threshold: 10,
                no_results_text: "No results match",
                placeholder_text_multiple: "Select filters",
                include_group_label_in_selected: true,
                width: "60%"
            });
        });
    },
    csvParser: function () {
        // Parse csv file, returns contents in an array of arrays,
        // amount of which depends on amount of columns in the source file
        this.parseCSV = async function (filepath) {
            let alltext = await fetch(filepath)
                .then(response => response.text())
                .then(text => text);

            let UserId = [], NotificationId = [], Type = [], Category = [], Title = [],
                Action = [], Latitude = [], Longitude = [], Timestamp = [];

            let lines = alltext.split('\n');
            for (let i = 0; i < lines.length - 1; ++i) {

                let fields = lines[i].split('\t');
                //let fields = lines[i].split(',');

                UserId.push(fields[0]);
                NotificationId.push(fields[1]);
                Type.push(fields[2]);
                Category.push(fields[3]);
                Title.push(fields[4]);
                Action.push(fields[5]);
                Latitude.push(fields[6]);
                Longitude.push(fields[7]);
                Timestamp.push(fields[8]);
            }

            return [UserId, NotificationId, Type, Category, Title,
                Action, Latitude, Longitude, Timestamp]
        }
    },

     chart: function(chartContainer) {

     this.filters = [];
     this.showAll = true;

     // Transform datestring to date (or milliseconds since 1 January 1970 UTC)
     this.parseDate = async function(timestamp)
     {
         // Timestamp example: "2017-02-23 13:43:54.523"
         timestamp = timestamp.replace(/"/g, '');

         let y =  Number(timestamp.slice(0, 4));
         let m =  Number(timestamp.slice(5, 7))-1;
         let d =  Number(timestamp.slice(8, 10));
         let h =  Number(timestamp.slice(11, 13));
         let mn = Number(timestamp.slice(14, 16));

         let date = new Date(y, m, d, h, mn);

         return date.getTime();
     };
     // Add data to chart datasets
     this.addData = async function(filename, dateStart, dateEnd)
     {
         const parser = new myApp.widgets.csvParser();
         let data = await parser.parseCSV(filename);

         let lat = data[6];
         let lgn = data[7];
         let timestamps = data[8];

         // Filters depend on user input
         let filters = [[]];
         if ( this.filters.length > 0 && this.showAll ) {
             filters = [[], this.filters];
         }
         else if ( this.filters.length > 0 ) {
             filters = [this.filters];
         }
         // Clear datasets
         this.removeData();

         for ( let f=0; f < filters.length; ++f) {

             let utility = new myApp.utils.utils(filters[f]);

             let dataset = [];
             let labels = [];

             for (let i = 0; i < lat.length; ++i) {
                 let latitude = Number(lat[i].replace(/"/g, ''));
                 let longitude = Number(lgn[i].replace(/"/g, ''));

                 if (!isNaN(latitude) && !isNaN(longitude) &&
                     latitude !== 0 && longitude !== 0 &&
                     await utility.inFilter(data, i) &&
                     await utility.inDateRange(timestamps[i], dateStart, dateEnd))
                 {
                     dataset.push(1);
                     labels.push(await this.parseDate(timestamps[i]));
                 }
             }
             // Rescale x axis, automatic rescale acts weird
             this.chart.options.scales.xAxes = [{
                 type: "time",
                 time: {
                     min: dateStart,
                     max: dateEnd
                 }
             }];

             // Scale stepsize with date range
             let stepsize = (dateEnd.getTime() - dateStart.getTime()) / 50;
             let out = utility.summarize(dataset, labels, stepsize);
             dataset = out[0];
             labels = out[1];

             this.chart.data.datasets[f].data = dataset;

             // labels == timesteps, applies to all datasets
             if ( f === 0 ) {
                 this.chart.data.labels = labels;
             }

             this.chart.options.title.text = "";
         }
         await this.chart.update()
     };
     // Clear the datasets and timesteps
     this.removeData = async function() {
         this.chart.data.labels = [];

         for (let i=0; i < 2; ++i) {
             this.chart.data.datasets[i].data = [];
         }
     };
     let canvas = chartContainer.getElementsByClassName("Chart")[0];
     canvas.width  = canvas.offsetWidth;
     canvas.height = canvas.offsetHeight;

     let context = canvas.getContext('2d');

     this.filters = [];

     let data =   [];
     let labels = [];
     this.chart = new Chart(context, {
         type: 'line',
         data: {
             labels: labels,
             datasets: [{
                 data: data,
                 label: "All events",
                 backgroundColor:  ['rgba(122, 193, 255 , 0.2)'],
                 borderColor: ['rgba(88, 147, 225, 0.2)'],
             },
             {
                 data: [],
                 label: "Filtered",
                 backgroundColor:  ['rgba(122, 193, 255, 0.2)'],
                 borderColor: ['rgba(33, 97, 140, 0.2)'],
             }]
         },
         options: {
             showPointLabels: false,
             legend: {display:true},
             title:  {display:true},
             elements: {point: { radius: 0 }},
             scales: {
                 xAxes: [{
                     distribution: 'linear',
                     type: 'time',
                     ticks: {},
                     time: {

                         displayFormats: {
                             quarter: 'MMM YYYY'
                         }
                     }
                 }]
             }
         }
     });

     // TODO, possibly not needed at all
    this.update = function(value, arg1=null, arg2=null)
    {
        if ( value === "dates" ) {

        }
        else if ( value === "filters" ) {

        }
        this.chart.options.title.text = 'new title';
        this.chart.update();
    }
 }
},
data: {
    places: function () {
        this.places = new Map(); // C++-style Map to hold places

        this.addPlaces = async function(map, locationdata) {

            let svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 34.58 36.33" width="30" height="30"><defs><style>.cls-1{fill:url(#radial-gradient);}.cls-2{fill:#3db983;}.cls-3{fill:#fff;}.cls-4{fill:none;stroke:#2b9166;stroke-miterlimit:10;}</style><radialGradient id="radial-gradient" cx="0.07" cy="31.51" r="8.34" gradientTransform="translate(17.18 20.69) scale(1.54 0.39)" gradientUnits="userSpaceOnUse"><stop offset="0"/><stop offset="1" stop-opacity="0"/></radialGradient></defs><title>music-shadow</title><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><ellipse class="cls-1" cx="17.29" cy="33.06" rx="12.83" ry="3.27"/><circle class="cls-2" cx="17.29" cy="17.29" r="16.79"/><path class="cls-3" d="M24.76,9.37V21.93a1.47,1.47,0,0,1-.38,1,2.53,2.53,0,0,1-1,.68,6.31,6.31,0,0,1-1.16.36,5,5,0,0,1-2.16,0,6.3,6.3,0,0,1-1.16-.36,2.53,2.53,0,0,1-1-.68,1.5,1.5,0,0,1,0-2,2.54,2.54,0,0,1,1-.68,6.38,6.38,0,0,1,1.16-.36,5.39,5.39,0,0,1,1.08-.12,5.2,5.2,0,0,1,2.15.44v-6l-8.61,2.66V24.8a1.48,1.48,0,0,1-.38,1,2.54,2.54,0,0,1-1,.68,6.38,6.38,0,0,1-1.16.36,5.05,5.05,0,0,1-2.16,0,6.37,6.37,0,0,1-1.16-.36,2.54,2.54,0,0,1-1-.68,1.5,1.5,0,0,1,0-2,2.54,2.54,0,0,1,1-.68A6.37,6.37,0,0,1,10,22.76a5.46,5.46,0,0,1,1.08-.12,5.21,5.21,0,0,1,2.15.44V12.24a1,1,0,0,1,.21-.63,1.1,1.1,0,0,1,.55-.4l9.33-2.87a1,1,0,0,1,.31,0,1.07,1.07,0,0,1,1.08,1.08Z"/><circle class="cls-4" cx="17.29" cy="17.29" r="16.79"/></g></g></svg>`;
            let icon = new H.map.Icon(svgMarkup);

            const parser = new myApp.widgets.csvParser();
            let data = await parser.parseCSV(locationdata);

            for (let i = 0, j = data[0].length; i < j; ++i) {
                let entries = data[0][i].split(','); // wrong format for csvParser, do some more parsing
                let name = entries[0];
                let id = Number(entries[3]);
                let likes = Number(entries[4]);
                let coords = {
                    lat: Number(entries[1]),
                    lng: Number(entries[2])
                };

                let place = {
                    id: id,
                    name: name,
                    type: "Establishment", // enum could work here. string is probably bad for performance etc
                    coords: coords,
                    totalCustomers: 0,
                    currentCustomers: 0,
                    likes: likes
                };

                this.places.set(name, place); // Add to map with name as key

                let marker = new H.map.Marker(coords, {icon: icon});
                marker.setZIndex(2); // place markers go above people markers with higher Z index
                map.map.addObject(marker);
                marker.setData(place); // connect the marker to this data for mouseover events
            }

        };
        this.countCustomers = function(people) {
            // counts the number of visits to places

            for (let key of people.people.keys()) { // currently counts multiple visits from the same person again
                let person = people.people.get(key);
                for (var place of person.places)
                    this.places.get(place).totalCustomers += 1; // all locations a person has gone to gets added to total count
                this.places.get(place).currentCustomers += 1; // last location gets added to current count
            }
        };

    },
    people: function () {
        this.people = new Map();

        this.addPeople = async function(map, peopledata) {
            const parser = new myApp.widgets.csvParser();
            let data = await parser.parseCSV(peopledata);

            for (let i = 1, j = data[0].length; i < j; ++i) { // skip header row

                let place = data[4][i].replace(/"/g, ''); // replace is to fix weird format coming out of parser, probably should fix it on parser/data side...
                let type = data[5][i].replace(/"/g, '');
                let lat = Number(data[6][i].replace(/"/g, ''));
                let lng = Number(data[7][i].replace(/"/g, ''));
                let id = data[0][i];

                if (type === 'Like')  // add likes here? unimplemented, currently included with places info
                    continue;

                if (this.people.has(id)) { // existing entry found, add new place/coords to it
                    let person = this.people.get(id);
                    if (place === person.places[person.places.length-1]) // Unless it's the same place again...
                        continue;
                    person.places.push(place);
                    person.lats.push(lat);
                    person.lngs.push(lng);
                }
                else { // new id found
                    this.people.set(id,
                        {
                            id: id,
                            type: "Person", // rather not use string comparisons
                            places: [place],
                            lats: [lat],
                            lngs: [lng]
                        });
                }
            }

            for (let key of this.people.keys()) // Add the last location of each person to the map as markers
            { // maybe own function
                let person = this.people.get(key);
                let lastLocIdx = person.lats.length-1;
                let lat = person.lats[lastLocIdx];
                let lng = person.lngs[lastLocIdx];
                let marker = new H.map.Marker({lat: lat, lng: lng});
                marker.setData(person);
                map.map.addObject(marker);
            }
        };
        this.generateTopTrajectories = async function(places) {
            // Generate graph
            let graph = {};
            // Generate origin for each place
            for (let place of places.places) {
                //console.log(place[1]);
                graph[place[1].id] = {}
            }
            console.log(graph);
            // Generate directed, weighted edges/routes for each place
            // weight = times travelled from origin to destination
            for (let key of this.people.keys()) {
                let person = this.people.get(key);
                let origin = null;
                let destination = null;
                for (let place of person.places) {
                    origin = destination;
                    destination = place;
                    if (origin !== null) {
                        let originID = places.places.get(origin).id;
                        let destID = places.places.get(destination).id;

                        // New edge? Initialize to weight 1. Otherwise add 1 to its weight.
                        typeof graph[originID][destID] === 'undefined' ? graph[originID][destID] = 1 : graph[originID][destID]++;
                    }
                }
            }
            //console.log(graph);
            let paths = [];

            // Graph done, search it. Find length 4(?) paths from each starting point. Could probably also find
            // a length 5 path from a fake node with 0-weight connections to each node for the same result.

            // Extremely heavy operation!! Something like O(|V|^n), where |V| is the number of places and n is length of
            // path. This should really be done on a server and then just send the results to app users.
            for (let source = 0, places_amount = places.places.size; source < places_amount; ++source) {
                // Consider a proper queue instead of Array
                let Q = [];
                Q.push([[source], 0]);

                // Must queue full paths to know where to continue

                while (Q.length > 0) {
                    let path = Q.shift();
                    let path_nodes = path[0];
                    if (path_nodes.length > 3) {  // Stop search when length is 4 and push to finalized paths
                        paths.push(path);
                        continue;
                    }

                    let path_length = path[1];
                    let u = path_nodes[path_nodes.length - 1]; // Source u is the last node on current route

                    // Go through adjacent nodes of u, add them as new paths
                    for (let v in graph[u]) {
                        let new_path = path_nodes.slice(); // Must be copied, otherwise all v's keep adding to same path
                        new_path.push(Number(v));
                        Q.push([new_path, path_length + graph[u][v]]); // Add found new path and its length to queue
                    }
                }
            }
            paths.sort((a, b) => {return a[1] < b[1]});
            return paths.slice(0, 5); // Dump rest of the trajectories as we only want top 5.
        }
    },
}
};

// -----------------------------------------------------------------------------
// ------ Main -----------------------------------------------------------------
// -----------------------------------------------------------------------------

async function main() {
    // Event data from citytrack app
    const dataFile = 'feikkidata.csv';
    //const dataFile = 'file:///home/leevi/Documents/CT_Demos/map_demo/feikkidata.csv'
    const peopledata = 'feikkidata.csv';
    const placedata = 'paikat.csv';

    // ------ HTML elements ------
    const mapContainer = document.getElementById('mapContainer');
    const datePickerContainer = $("#datetimes");
    const sliderContainer = $("#sliderContainer");
    const filterContainer = $('#filterSelector');
    const chartContainer = document.getElementById("chartContainer");

    // Map object
    const map = new myApp.widgets.map(mapContainer, dataFile);

    // Heatmap toggle -button
    const button1 = document.getElementById('button1');
    // Map/charts toggle -button
    const button2 = document.getElementById('button2');
    // Show all/show filtered toggle button
    const button3 = document.getElementById('button3');

    // Button for trajectories
    const trajButton = document.getElementById('trajButton');
    trajButton.addEventListener('click', toggle_trajectories);

    // checkboxes for selecting which top5 trajectories to show
    let trajCheckboxContainer = document.getElementById('CheckboxContainer');
    let trajCheckboxes = [];
    for (let i = 0; i < 5; i++) {
        trajCheckboxes.push(document.getElementById('trajCheck' + i));
        trajCheckboxes[i].addEventListener('click', trajCheckbox_clicked);
    }

    // Dropdown menu for picking date ranges
    const datePicker = new myApp.widgets.datePicker(
        datePickerContainer,
        new Date(2018, 0, 1),
        new Date(2019, 0, 1)
    );

    // Slider for picking date ranges
    const slider = new myApp.widgets.dateSlider(
        sliderContainer,
        datePicker.minDate,
        datePicker.maxDate
    );

    // Filter heatmap with citytrack event data
    const filter =  new myApp.widgets.filter(filterContainer);
    const options = ["Action", "Category", "Notification id",
                     "Title", "Type", "Userid"];
    await filter.addOptions(options, dataFile);

    const chart = new myApp.widgets.chart(chartContainer);
    chart.addData(dataFile, slider.dateStart, slider.dateEnd);

    let heatMapOn = false; // for toggle switch
    let heatMap; // heatMapProvider -object

    const places = new myApp.data.places();
    await places.addPlaces(map, placedata);

    const people = new myApp.data.people();
    await people.addPeople(map, peopledata);
    places.countCustomers(people);
    let top5trajs = await people.generateTopTrajectories(places);
    const EARTH_RADIUS = 6.3781e6;

    // Called when filters or date range are changed
    async function updateHeatMap()
    {
        sliderContainer.attr('disabled', 'disabled');
        button1.disabled = true;
        filterContainer.attr('disabled', 'disabled');
        datePickerContainer.attr('disabled', 'disabled');
        if (heatMapOn) {
            heatMap = await heatMap.clear();
            heatMap = await map.drawHeatMap(
                map,
                slider.dateStart,
                slider.dateEnd,
                heatMap
            );
        }
        sliderContainer.removeAttr('disabled');
        button1.disabled = false;
        filterContainer.removeAttr('disabled');
        datePickerContainer.removeAttr('disabled');
    }



    // Date range changed
    datePickerContainer.on("apply.daterangepicker", function (e, data) {
        let dateStart = data.startDate.toDate();
        let dateEnd = data.endDate.toDate();

        slider.update("bounds", dateStart, dateEnd);
        slider.update("values", dateStart, dateEnd);
        slider.update("formatter", dateStart, dateEnd);
    });

    // Date range slider moved
    sliderContainer.bind("valuesChanged", async function (e, data) {

        slider.dateStart = await data.values.min;
        slider.dateEnd = await data.values.max;

        chart.addData(dataFile, slider.dateStart, slider.dateEnd);
        await updateHeatMap();
    });

    // Filters added/removed
    filterContainer.on('change', async function (evt, input) {
        if (input != null && input.selected != null) {

            map.filters.push(input.selected);
            chart.filters.push(input.selected);
        }
        if (input != null && input.deselected != null) {
            let index = map.filters.indexOf(input.deselected);
            if (index !== -1) {
                map.filters.splice(index, 1);
                chart.filters.splice(index, 1);
            }
        }

        chart.addData(dataFile, slider.dateStart, slider.dateEnd);
        await updateHeatMap();
    });

    // Heatmap toggle -button clicked
    async function toggleHeatMap() {
        button1.disabled = true;

        if (!heatMapOn) {
            heatMap = heatMap = await map.drawHeatMap(
                map,
                slider.dateStart,
                slider.dateEnd,
                heatMap
            );
            heatMapOn = true;
            button1.value = "Heatmap ON";
            button1.style.background = "#239b56"

        } else {
            heatMap = await heatMap.clear();
            heatMapOn = false;
            button1.value = "Heatmap OFF";
            button1.style.background = "#922b21"
        }
        button1.disabled = false;
    }
    button1.addEventListener('click', toggleHeatMap);

    // Heatmap toggle -button clicked
    async function toggleDivs() {
        button2.disabled = true;

        if ( mapContainer.style.display === "none" ) {
            mapContainer.style.display = 'block';
            chartContainer.style.display = 'none';
            button2.value = "Charts";
        }
        else {
            mapContainer.style.display= 'none';
            chartContainer.style.display = 'block';
            button2.value = "Map";
        }
        button3.style.display = chartContainer.style.display;

        button2.disabled = false;
    }
    button2.addEventListener('click', toggleDivs);

    // Filter toggle -button clicked
    async function toggleFilters() {
        button3.disabled = true;

        if ( chart.showAll === false ) {
            chart.showAll = true;

            button3.value = "Show only filtered";
        }
        else {
            chart.showAll = false;

            button3.value = "Show all events";
        }
        chart.addData(dataFile, slider.dateStart, slider.dateEnd, true);

        button3.disabled = false;
    }
    button3.addEventListener('click', toggleFilters);



    let topTrajectories = [];
    function trajCheckbox_clicked() { // set visibilities when clicking trajectories on and off
        for (let idxvalue_pair of trajCheckboxes.entries()) {
            let idx = idxvalue_pair[0], checkbox = idxvalue_pair[1];
            checkbox.checked ? topTrajectories[idx].setVisibility(true) : topTrajectories[idx].setVisibility(false);
        }
    }

    const toRadians = (angle) => { return angle/180*Math.PI };

    // Equirectangular approximation, should be close enough for these small distances
    function calculate_length(lats, lngs) {
        let length = 0;
        for (let i = 1; i < lats.length; i++)
        {
            let lat1 = toRadians(lats[i-1]);
            let lat2 = toRadians(lats[i]);
            let lng1 = toRadians(lngs[i-1]);
            let lng2 = toRadians(lngs[i]);

            let x = (lng2-lng1)*Math.cos((lat1+lat2)/2);
            let y = lat2-lat1;
            length += Math.sqrt(x*x + y*y) * EARTH_RADIUS;
        }
        return length;
    }

    let trajsActive = false; // Tracks whether trajectories are hidden or visible

    async function toggle_trajectories() {

        if (topTrajectories.length > 0) { // Toggle visibility if already initialized
            trajsActive = !trajsActive;
            for (let i in topTrajectories) {
                if (!trajsActive)
                    topTrajectories[i].setVisibility(false);
                else
                    topTrajectories[i].setVisibility(trajCheckboxes[i].checked);
            }
            trajsActive? trajCheckboxContainer.style.visibility = 'visible': trajCheckboxContainer.style.visibility = 'hidden';
            trajsActive? trajButton.value = "Hide Top 5 Trajectories" : trajButton.value = "Show Top 5 Trajectories";
        }
        else { // Generate map objects on first press. Top 5 trajectories.
            let colors = ['rgba(255, 0, 0, 0.7', 'rgba(200, 34, 34, 0.7',
                'rgba(255, 165, 0, 0.7', 'rgba(200, 120, 0, 0.7', 'rgba(255, 215, 0, 0.7'];

            for (let i = 0; i < 5; i++) {
                let strip = new H.geo.Strip();
                let route = [];
                let lats = [];
                let lngs = [];

                for (let j = 0, k = top5trajs[i][0].length; j < k; ++j) {
                    let id = top5trajs[i][0][j];
                    for (let key of places.places.keys()) {
                        if (places.places.get(key).id === id) {
                            let lat = places.places.get(key).coords.lat;
                            let lng = places.places.get(key).coords.lng;
                            route.push(places.places.get(key).name);
                            strip.pushLatLngAlt(lat, lng);
                            lats.push(lat);
                            lngs.push(lng);
                        }
                    }
                }

                let routelength = Math.floor(calculate_length(lats, lngs));
                console.log(routelength);
                let timesTaken = top5trajs[i][1];

                let trajectory = new H.map.Polyline(strip, {
                    style:
                        {strokeColor: colors[i], lineWidth: 8},
                    arrows: {width: 1},
                    //ZIndex: Math.floor(20/i)
                });

                trajectory.setZIndex(1000 / routelength);  // set shortest route on top

                // Add data for mouseover events to show
                trajectory.setData({
                    type: 'Trajectory',
                    route: route,
                    //destination: destination,
                    timesTaken: timesTaken,
                    routeLength: routelength
                });

                topTrajectories.push(trajectory); // store the polylines so they can be toggled on/off
                map.map.addObject(trajectory);
                trajCheckboxContainer.style.visibility = 'visible';


                for (let checkbox of trajCheckboxes)
                    checkbox.checked = true;
                trajsActive = true;
                trajButton.value = "Hide Top 5 Trajectories"
            }
        }
    }

    // show info bubble on hover
    let hoveredObject;
    let infoBubble = new H.ui.InfoBubble({lat: 0, lng: 0}, {});
    infoBubble.addClass('info-bubble');
    infoBubble.close();
    map.ui.addBubble(infoBubble);

    map.map.addEventListener('pointermove', (e) => {

        if (hoveredObject && hoveredObject !== e.target) { // bubble open, moved pointer away
            infoBubble.close();
        }

        hoveredObject = e.target;
        if (hoveredObject.icon || hoveredObject instanceof H.map.Polyline) { // Test if hovered object is marker or line
            let target = hoveredObject.getData();
            if (target) {
                let type = target.type;

                let pos = map.map.screenToGeo(
                    e.currentPointer.viewportX,
                    e.currentPointer.viewportY);
                infoBubble.setPosition(pos);

                if (type === "Establishment") // string comparisons are probably not good, fix "later"
                {
                    let name = target.name;
                    let totalCustomers = target.totalCustomers;
                    let currentCustomers = target.currentCustomers;
                    let likes = target.likes;
                    let id = target.id;

                    infoBubble.setContent(`
                <div class="info-bubble-title">Name: ${name}</div>
                <div class="info-bubble-label">
                    <br />
                    ID: ${id}
                    <br />
                    ${type}
                    <br />
                    Current customers: ${currentCustomers}
                    <br />
                    Total customers: ${totalCustomers}
                    <br />
                    Likes: ${likes}
                </div>`);
                }
                else if (type === "Person")
                {
                    let place = target.places[target.places.length-1];
                    let id = target.id;

                    infoBubble.setContent(`
                <div class="info-bubble-title">ID: ${id}</div>
                <div class="info-bubble-label">
                    <br />
                    ${type}
                    <br />
                    Location: ${place}
                </div>`);
                }
                else if (type === "Trajectory")
                {
                    let route = target.route.join("-");
                    let timesTaken = target.timesTaken;
                    infoBubble.setContent(`
                <div class="info-bubble-title">Trajectory</div>
                <div class="info-bubble-label">
                    <br />
                    Route: ${route}
                    <br />
                    Times taken: ${timesTaken}
                    <br />
                    Length: ${target.routeLength} m               
                </div>`);
                }

                infoBubble.open();
            }
        }
    });


    let personPath = null;

    let clickedObject;
    map.map.addEventListener('tap', (e) => {
        if (clickedObject && clickedObject !== e.target) {
            if (personPath != null)
                map.map.removeObject(personPath);
            personPath = null;
        }

        clickedObject = e.target;
        if (clickedObject.icon) {
            if (personPath != null)
                map.map.removeObject(personPath);
            let data = clickedObject.getData();

            if (data.type === 'Person') {

                let strip = new H.geo.Strip();
                let lats = data.lats;
                let lngs = data.lngs;
                if (lats.length === 1) {
                    console.log("No trajectory, only 1 location");
                    return;
                }

                for (let i = 0; i < lats.length; i++)
                    strip.pushLatLngAlt(lats[i], lngs[i]);
                // Create a polyline to display the route:
                personPath = new H.map.Polyline(strip, {
                    style:
                        {strokeColor: 'rgba(0, 0, 200, 0.5)', lineWidth: 8},
                    arrows: {width: 1.8}
                });
                map.map.addObject(personPath);
            }
        }
    });

}


main();
