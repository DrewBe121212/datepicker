/*global window,globals,jQuery */

/**
 * @file Manages the jQuery datepicker widgets to include panning options.
 *       This is intended to replace the current datepicker.cfm module which
 *       contains many limitations for dynamic pages.
 * @author Tristan Lee, Drew Dulgar
 *
 * REQUIREMENTS
 *    - include this script within the wrapper (eg: specjs="datepicker.js")
 * 
 * USAGE
 *    This datepicker extension works right along with the jQuery Datepicker widget,
 *    extending its functionality. To create a datepicker widget, simply include
 *    the following:
 *
 *    <input name="mypicker" class="date-picker" type="text" ... />
 *
 *    A <tt>window.Datepicker</tt> object is also created so that new instances of
 *    datepickers can be initialized on the page.
 *
 * (Re-)Initialize Datepicker
 *    By default, inclusion of this file will automatically initialize any new datepickers
 *    defined in the document once the DOM has entered the ready state. If new datepickers
 *    are added to the document after initialization, they will need to be initialized 
 *    manually. Eg:
 *
 *    window.Datepicker.init($("#anotherDatepicker")); // a specific datepicker
 *    window.Datepicker.init($(".date-picker")); // a collection of datepickers
 * 
 * ATTRIBUTES (required)
 *    name: must contain the name of your datepicker element
 *    class="date-picker": indicates this element should render as a datepicker
 *    type="text": datepickers can only be applied to text fields
 *
 * ATTRIBUTES (optional)
 *    value: the initial date to set the picker to (see DATE FORMAT for formatting)
 *    data-pan="{day|week|month|year}": sets the interval of panning (defaults to "day")
 *    data-mindate="{date}": sets the minimum date able to be selected (see DATE FORMAT for formatting)
 *    data-maxdate="{date}": sets the maximum date able to be selected (see DATE FORMAT for formatting)
 *    data-clearicon="{true|false}": sets an icon next to the value so it can be cleared (defaults to "false")
 *        NOTE: this option is unavailable for disabled fields (month and year panning)
 *	  data-datespanstart="{other_dp_id}": sets the value of other_dp_id to the currently selected value if the value is less than other_dp_id
 *	  data-datespanend="{other_dp_id}": sets the value of other_dp_id to the currently selected value if the value is greater than other_dp_id
 *	  data-maxdayspan="{integer}": maximum number of days that can be selected between two date pickers
 *		  NOTE: requires datespan[start|end] to be set to work. 
 *
 * DATE FORMAT
 *    Dates supplied to the "value", "data-mindate", and "data-maxdate" attributes must adhere
 *    to the mm/dd/yyyy format. All panning options require a full date. For exmaple, if panning
 *    by year, an example date of 10/28/2018 is valid and required. However, only 2018 will
 *    be displayed.
 *
 * PANNING
 *    All datepickers include the left and right panning options. Clicking a pan button will
 *    increase or decrease the date respectively. Long-pressing the pan button will continue
 *    to change the date value until the mouse button is released.
 *
 *    The datepicker actual value is based on the pan option. See below for references:
 *       day: date will be set as the day selected (10/28/2010 -> 10/28/2010)
 *       week: date will be set on the Monday of the week of the day selected (10/28/2010 -> 10/25/2010)
 *       month: date will be set to the first day of the month and year of the day selected (10/28/2010 -> 10/1/2010)
 *       year: date will be the first month and first day of the year selected (10/28/2010 -> 1/1/2010)
 *
 * EXAMPLES
 * 
 *    Creates an empty datepicker panning by day
 *    <input name="startdate" class="date-picker" type="text" />
 *
 *    Creates an empty datepicker panning by week
 *    <input name="startweek" class="date-picker" type="text" data-pan="week" />
 *
 *    Creates a datepicker with a date of 10/28/2010 panning by month
 *    <input name="startmonth" class="date-picker" type="text" value="10/28/2010" data-pan="month" />
 *
 *    Creates a datepicker with the initial year of 2014 and a range between 2010 and 2016
 *    <input name="yearpicker" class="date-picker" type="text" value="12/12/2014" data-pan="year" data-mindate="10/20/2010" data-maxdate="10/30/2016" />
 *
 *    Creates a datepicker with a date of 10/28/2010 with the option to clear the date
 *    <input name="clearfield" class="date-picker" type="text" data-clearicon="true" value="10/28/2010" />
 */

;(function (window, $, undefined) {
    "use strict";
	
	if ($.datepicker && !$.datepicker.modifiedSetDate) {
		$.datepicker._setDate = (function () {
		   var _setDate = $.datepicker._setDate;
		   return function (inst, date, noChange) {
			   _setDate.apply(this, arguments);
			   inst.input.trigger("change");
		}
		}());	
		$.datepicker.modifiedSetDate = true;
	}

    window.Datepicker = window.Datepicker || (function () {

        // private methods/members
        var 
            // constants
            _parseFormat = "mm/dd/yy",
            _dpSelector = ".date-picker",
            _dpContainerClass = "date-picker-container",
            _dpContainerSelector = "." + _dpContainerClass,
            _dpValSelector = _dpContainerSelector + " .hasDatepicker",
            _dpInputSelector = "input[name]" + _dpSelector,
            _dpPanClass = "dp-pan",
            _dpPanSelector = "span.dp-pan",
			_topFix = 40,
            
            // trigger to determine if the events need set on the DOM
            eventsSet = false,
            
            /**
             * Renders all of the <tt>input</tt> elements into Datepicker wigets
             * @private
             * @param {jQuery} [$picker] specified picker to initialize
             * @returns {void}
             */
            renderDatepickers = function ($picker) {
                var
                    // datepicker requires both a <tt>name</tt> and <tt>class</tt> for initialization
                    $dps = $($picker).length && $($picker) || $(_dpInputSelector),
                    
                    // datepicker container
                    $container = $("<div>").addClass(_dpContainerClass + " pan-inputs"),
                    
                    // left and right pans
                    $pan = $("<span>").addClass(_dpPanClass);
                    
                $dps.each(function () {
                    var 
						// field that will display the date
						$dispField = $(this),
						
						// datepicker config options
                        opts = getOptions($dispField),
						
						// alternate field the datepicker will be applied to
                        $altField = $("<input>").attr({"type": "hidden"}),
						
						// reinit the datepicker if it's been initialized once
						reinit = $dispField.siblings(".hasDatepicker").length !== 0,
						
						// icon next to the date to clear the field
						$clearIcon = $('<a>').attr('title', 'Clear the set date')
											 .addClass('clear-icon ui-icon ui-icon-triangle-1-ne')
											 .on('click', function(e) {
												$altField.datepicker('setDate', '');//.trigger('change');
												return false;
											 }),
						// Calculate the number of days between two dates
						// Note: This number will always be positive, even if enddate is < startDate
						_daysBetween = function(startDate, endDate) {
							var oneDay = 24*60*60*1000;
							var daysBetween;
							
							startDate = new Date(startDate);
							endDate = new Date(endDate);
							
							daysBetween = Math.round(Math.abs((startDate.getTime() - endDate.getTime())/(oneDay)));
							
							return daysBetween;
							
						},
						// Calculate a new date from a given numer of days offset. 						
						_dateFromOffset = function(date, offset) {
							
							if (date != '') {
								date = new Date(date);
							
								date.setDate(date.getDate()+offset);
							}

							return date;

						},
						// function to toggle show/hide the clear icon. 
                        _toggleClearIcon = function () {    
                                $clearIcon.toggle(opts.clearIcon && !opts.disabled && $altField.datepicker('getDate') !== null); 
						},
						// Manage date spans when we have two fields tied to each other. These are set
						// via data-datespan[start|end]
						_manageDateSpan = function() {
							
							var $dp_span,
								date,
								target_date,
								daysBetween;
							
							date = $altField.val();
						
							// Manage data-datespanstart
							if (opts.dateSpanStart !== null && date != '') {
								date = new Date(date);
								
								$dp_span = $('#' + opts.dateSpanStart);
								
								if ($dp_span.length > 0) {
									
									target_date = $dp_span.val();
									
									if (target_date !== '') {
										
										target_date = new Date(target_date);
										
										if (opts.maxDaySpan !== null) {
											daysBetween = _daysBetween(date, target_date);
											if (daysBetween > opts.maxDaySpan) {
												target_date = _dateFromOffset(date, -opts.maxDaySpan);
											}
										}
										
										// A date was selected that is less than the target date
										if (date < target_date) {
											target_date = date;
										}
										
										// If the target date needs updated
										if (target_date.getTime() != new Date($dp_span.val()).getTime()) {
											if ($dp_span.data('datepicker_ID') !== undefined) {
												$('#' + $dp_span.data('datepicker_ID')).datepicker('setDate', target_date);
											} else { 
												$dp_span.val(target_date);
											}												
										}
									}
									

					
								}
								
							}
							
							// Manage data-datespanend
							if (opts.dateSpanEnd !== null && date != '') {
						
								date = new Date(date);
						
								$dp_span = $('#' + opts.dateSpanEnd);
						
								if ($dp_span.length > 0) { 
								
									target_date = $dp_span.val();

									if (target_date != '')
									{
										target_date = new Date(target_date);
										
										if (opts.maxDaySpan !== null) {
											daysBetween = _daysBetween(date, target_date);
											if (daysBetween > opts.maxDaySpan) {
												target_date = _dateFromOffset(date, opts.maxDaySpan);
											}
										}
										
										// A date was selected that is greater than the target date
										if (date > target_date) {
											target_date = date;											
										}
										
										// If the target date needs updated
										if (target_date.getTime() != new Date($dp_span.val()).getTime()) {
											if ($dp_span.data('datepicker_ID') !== undefined) {
												$('#' + $dp_span.data('datepicker_ID')).datepicker('setDate', target_date);
											} else { 
												$dp_span.val(target_date);
											}												
										}									

									}
									

								}
							}

						},						
						currentDate;
					// Private function to destroy a current date picker instance. 
					$dispField.destroy = function() {
						// remove all elements around the original datepicker input and reset the value
						var $datepicker = $('#' + $(this).data('datepicker_ID'));
						// Remove any attributes applied to the display field
						$(this).prop({readonly: false, disabled: false});
						$(this).val($datepicker.val());
						
						$datepicker.datepicker('destroy');
						
						$(this).siblings().remove();
						$(this).unwrap();
						$(this).attr("name", $dispField.data("name"));
					}
					
					// reinit the datepicker
					if (reinit) {
						$dispField.destroy();
					}					
					
                    // set the .date-picker INPUT to be the alternate field due to a bug
                    // in how the jQ datepicker handles formatted dates
                    opts.altField = $dispField;
                    
                    // copy data from the to-be alternate field to the display field
                    $altField.data($dispField.data());
                    
                    // copy the initial date value
                    $altField.val($dispField.val());
					
					// Attach the attribute name from the original display field
					$altField.attr("name", $dispField.attr("name"));	

 					// attach an id to the actual datepicker element if it doesn't currently exist. 
					// Otherwise we will rely on the internal datepicker id generation mechanism
					if ($dispField.attr('id') !== undefined)
					{
						$altField.attr('id', 'dp_' + $dispField.attr('id'));	
					}
					
                    // init the datepicker
                    $altField.datepicker(opts)
                        // Bind to the change event
                        .on('change', _toggleClearIcon)
						.on('change', _manageDateSpan)
                    
                    // set the date based on the pan
                    currentDate = $altField.datepicker("getDate");
                    if ($.type(currentDate) !== "date" && opts.disabled) {
                        $altField.datepicker("setDate", adjustDateByPan(new Date(), $altField));
                    } else if ($.type(currentDate) === "date") {
                        $altField.datepicker("setDate", adjustDateByPan(currentDate, $altField));
                    }
  	
                    // create the container
                    $dispField.wrap($container.clone())
                        // append the alternate field
                        .before($altField)
                        
                        // append the left pan
                        .before($pan.clone().addClass("left"))
                        
                        // append the right pan
                        .after($pan.clone().addClass("right"))

						// append the clear date icon
						.after($clearIcon)	
                        
                        // remove the 'name' attribute
						.data("name", $dispField.attr("name"))
                        .removeAttr("name")
                        
						// Keep reference to the datepicker ID
						.data("datepicker_ID", $altField.attr("id"))
						
                        .addClass("inset")
						
                        .prop({"readonly": true, disabled: opts.disabled});

					_manageDateSpan();

                    _toggleClearIcon();
                });
            },
            
            /**
             * Gets all the configuration options for the passed datepicker element

             * @private
             * @param {jQuery} picker the datepicker element
             * @returns {Object} configuration options for the datepicker
             */
            getOptions = function ($picker) {                
                var opts = {
                    altField: null,
                    altFormat: getFormat($picker.data("pan")).altFormat,
                    changeMonth: false,
                    firstDay: 1,
                    dateFormat: getFormat($picker.data("pan")).displayFormat,
                    onSelect: function(dateText, i) {
                        if (dateText !== i.lastVal) {
                            $(this).trigger('change', [dateText, i]);    
                        }
                    },
                    disabled: $picker.data("pan") === "month" || $picker.data("pan") === "year",
                    showWeek: $picker.data("pan") === "week",
                    clearIcon: $picker.data("clearicon") !== undefined && $.trim($picker.data("clearicon")) !== "" && $picker.data("clearicon"),
					maxDaySpan: null,
					dateSpanStart: null,
					dateSpanEnd: null
                    
                };
                
                if ($picker.data("mindate") !== undefined && $.trim($picker.data("mindate")) !== "") {
                    opts.minDate = $.datepicker.parseDate(_parseFormat, $picker.data("mindate"));
                }
                
                if ($picker.data("maxdate") !== undefined && $.trim($picker.data("maxdate")) !== "") {
					opts.maxDate = $.datepicker.parseDate(_parseFormat, $picker.data("maxdate"));
                }
				
				if ($picker.data("maxdayspan") !== undefined && $.trim($picker.data("maxdayspan")) !== "" && $picker.data("maxdayspan") >= 0)
				{
					opts.maxDaySpan = $picker.data("maxdayspan");	
				}
				
				if ($picker.data('datespanstart') !== undefined && $.trim($picker.data('datespanstart')) !== "" && $('[name=' + $picker.data('datespanstart') + ']').length > 0) {
					opts.dateSpanStart = $picker.data('datespanstart');
				}	

				if ($picker.data('datespanend') !== undefined && $.trim($picker.data('datespanend')) !== "" && $('[name=' + $picker.data('datespanend') + ']').length > 0) {
					opts.dateSpanEnd = $picker.data('datespanend');
				}
				
                return opts;                
            },
            
            /**
             * Gets the date format based on the pan
             * @private
             * @returns {Object} Object containg formats for <tt>altFormat</tt> and <tt>displayFormat</tt>
             */
            getFormat = function(pan) {                
                switch (pan) {
                    case "month":
                        return {altFormat: "M, yy", displayFormat: _parseFormat};
                    case "year":
                        return {altFormat: "yy", displayFormat: _parseFormat};
                    default:
                        return {altFormat: "D, M d, yy", displayFormat: _parseFormat};
                }
            },
            
            /**
             * Sets up the click events for the datepicker and pans
             * @private
             * @returns {void}
             */
            setupEvents = function () {
                var clsPan = "." + _dpContainerClass + " " + _dpPanSelector,
                    timeout;
                    
                if (!eventsSet) {
                    // When the date has been changed, adjust the value basd on the pan
                    /*$(window.document.body).on("change.date-picker", _dpValSelector, function (e) {
                        var $this = $(this),
                            date = $this.datepicker("getDate");
                          
                        if ($.type(date) === "date") {
                            date =  adjustDateByPan(date, $this);
                            $this.blur();
                        }
                    });*/
                    
                    // Because the datepicker is actualy on the hidden field, we must trigger
                    // the display of the datepicker when the display field is clicked
                    $(window.document.body).on("click.date-picker", _dpSelector, function (e) {
                        var $this = $(this),
                            $dp = $this.parent().children(".hasDatepicker");
                        
                        $dp.datepicker("show");
						$dp.datepicker("widget").css("top", $dp.datepicker("widget").position().top + _topFix);
                    });
                        
                    // Adjust the date when clicking the < or > pans, optionally holding the buttons down for a quick pan
                    $(window.document.body).on({
                        "mousedown.date-picker-pan": function (e) {
							// Left mouse click only
                            if (e.which === 1) {
								var $this = $(this),
									start = 500,
									minInterval = 75,
									repeat = function (interval) {
										var 
											$picker = $this.parent().children(".hasDatepicker"),
											pan = $picker.data("pan") || "day",
											date = $picker.datepicker("getDate"), origDate,
											add = $this.hasClass("right"),
											direction = add ? ["right", "left"] : ["left", "right"],
											min = $picker.datepicker("option", "minDate"),
											max = $picker.datepicker("option", "maxDate");

											if ($.type(date) === "date") {
												switch (pan.toLowerCase()) {
													case "week":
														var newDate = (date.getDay() + 6) % 7;
														date.setDate(date.getDate() - newDate);
														origDate = new Date(date);

														if (add) {
															date.setDate(date.getDate() + 7);
															if (max && date > max) {
																date = origDate;
															}
														}
														else {
															date.setDate(date.getDate() - 7);
															if (min && date < min) {
																date = origDate;
															}
														}
														break;
													case "month":
														if (add) {
														  date.setMonth(date.getMonth() + 1);
														}
														else {
														  date.setMonth(date.getMonth() - 1);
														}
														break;
													case "year":
														if (add) {
														  date.setFullYear(date.getFullYear() + 1);
														}
														else {
														  date.setFullYear(date.getFullYear() - 1);
														}
														break;
													default:
														if (add) {
														  date.setDate(date.getDate() + 1);
														}
														else {
														  date.setDate(date.getDate() - 1);
														}
														break;
												}
											}    
										date = adjustDateByPan(date, $this);

										// yummy effect!
										if (date) {
											
											$picker.datepicker("setDate", date);
											//.trigger('change');
											/*$picker.siblings(".date-picker")
												.effect("drop", {direction: direction[0]}, start == 500 ? "fast" : start,
													function () {$picker.datepicker("setDate", date);})
												.effect("slide", {direction: direction[1]}, start == 500 ? "fast" : start);
											*/
											// continue to call the function until the timeout is cleared
											timeout = setTimeout(repeat, interval || start);
										}

										// slowly decrease the timeout interval for increased speed
										if (start > minInterval) {
											start += (start / 7) * -1;
										}
									};
								repeat(500);
							}
                        },
                        
                        "mouseup.date-picker-pan": function (e) {
                            clearTimeout(timeout);                    
                        },
                        
                        "mouseleave.date-picker-pan": function (e) {
                            clearTimeout(timeout);    
                        }
                    }, clsPan);
                    
                    eventsSet = true;
                }
            },
            
            /**
             * Sets the date based on the pan
             * @private
             * @param {Date} date current date of the datepicker
             * @param {jQuery} $picker datepicker element
             * @returns {Date} the adjusted Date object
             */
            adjustDateByPan = function (date, $picker) {
                var newDate,
                    pan = $picker.data("pan") || "",
                    min = $picker.datepicker("option", "minDate"),
                    max = $picker.datepicker("option", "maxDate"),
                    minMon, minDays, maxMon, maxDays;
                    
                if ($.type(date) === "date") {
                    switch (pan) {
                        case "month":
                            date.setDate(1);
                            break;
                        
                        case "year":
                            date.setMonth(0,1);
                            break;
                        
                        case "week":
                            // set the minimum and maximum Monday allowed based on date limits
                            if (min) {
                                minMon = new Date(min);
                                minDays = (min.getDay() + 6) % 7;
                                minMon.setDate(minMon.getDate() - minDays);
                                
                                if (minMon < min) {
                                    minMon.setDate(minMon.getDate() + 7);
                                }
                            }
                            
                            if (max) {
                                maxMon = new Date(max);
                                maxDays = (max.getDay() + 6) % 7;
                                maxMon.setDate(maxMon.getDate() - maxDays);
                                
                                if (maxMon > max) {
                                    maxMon.setDate(maxMon.getDate() - 7);
                                }
                            }
                            
                            newDate = (date.getDay() + 6) % 7;
                            date.setDate(date.getDate() - newDate);
                            
                            // if the date is out of range, set it to the limit
                            if (min && date < minMon) {
                                date = minMon;
                            }
                            else if (max && date > maxMon) {
                                date = maxMon;    
                            }
                            
                            break;
                    }
                }
                
                return date;                
            };
        
        // public methods/members
        return {
            init: function ($picker) {
                // initialize the datepicker fields
                renderDatepickers($picker);
                
                // initialize the events
                setupEvents();
            }
        };
    }());
        
    // DOMReady
    $(function () {
        window.Datepicker.init();
    });
    
})(window, jQuery);
//# sourceURL=datepicker.js
