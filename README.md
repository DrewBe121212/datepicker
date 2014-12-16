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
