import numpy as np
import time

places = [
['Hopealinjat', 61.495072, 23.759612],
#'Gastrolaiva MS Tampere'
['Union', 61.496186, 23.761214],
['Fat Lady', 61.498437, 23.767848],
['London',  61.498639, 23.76656],
['Ilona', 61.497219, 23.767453],
['Ruby & Fellas', 61.49757, 23.762918],
['Cafe Europa', 61.497709, 23.769066],
['Bricks', 61.497709, 23.758527],
['Space Bowling', 61.497261, 23.756773],
['Sticky Wingers', 61.497835, 23.770546],
['Roska', 61.498535, 23.768257],
['Henry’s Pub', 61.497993, 23.76654],
['Bar Passion', 61.498475, 23.777849],
['Ale Pub', 61.497168, 23.755824],
['Ale-Bar Pikajuna', 61.498192, 23.769772],
['Jack the Rooster', 61.500938, 23.763801],
['Pelaamo', 61.498835, 23.756421],
['Poro', 61.4955, 23.766133]]
# ...

class Person:
    groupEarlyLeave = {'Young': 0.1,  # different customer types, not implemented
                       'Mature': 0.25,
                       'Old': 0.4}

    possibleTargets = len(places)
    persons = 0

    def __init__(self, group, age=20):
        self.__group = group
        self.__age = age
        self.__location = None
        self.__id = Person.persons
        Person.persons += 1

    def next_stop(self):
#        early_stop = np.random.random()
#        if early_stop < Person.groupEarlyLeave[self.__group]:
#            return None  # quit for the night
        switchroll = np.random.random()
        if switchroll < 0.5:
            newplace = places[np.random.randint(0, Person.possibleTargets)]
            if self.__location == newplace:  # rolled current place, stay there
                return False
            self.__location = newplace
            return newplace

            ## prefer closeby stuff?
        else:
            return False  # stay in current place

    def get_id(self):
        return self.__id


class Timer:
    def __init__(self):
        self.__day = 15
        self.__hours = 18
        self.__minutes = 0

    def tick_minutes(self, minutes):
        self.__minutes += minutes
        while self.__minutes >= 60:
            self.__hours += 1
            self.__minutes -= 60
            if self.__hours >= 24:
                self.__day += 1
                self.__hours -= 24

    def get_time(self):
        return self.__day, self.__hours, self.__minutes


if __name__ == '__main__':
    with open('paikat.csv', 'w') as f:
        for idx, place in enumerate(places):
            f.write(",".join((place[0], str(place[1]), str(place[2]), str(idx))) + '\n')

    with open('feikkidata.csv', 'w') as f:
        f.write('"Userid"\t"Notification id"\t"Type"\t"Category"\t"Title"\t"Action"\t"Lat"\t"Lng"\t"Timestamp"\n')

    people = []

    for i in range(55):
        roll = np.random.random()
        if roll < 0.1:
            people.append(Person('Old'))
        elif 0.1 <= roll < 0.25:
            people.append(Person('Mature'))
        else:
            people.append(Person('Young'))

    timer = Timer()
    times = timer.get_time()
    timeOfDay = time.mktime((2018, 10, times[0], times[1], times[2], 00, 0, 0, -1))
    outtime = time.strftime("%Y-%m-%d %H:%M:%S.000", time.localtime(timeOfDay))

    with open('feikkidata.csv', 'a') as f:
        for timesteps in range(0, 10):
            for person in people:
                ret = person.next_stop()
                if ret:
                    place, lat, lon = ret
                    person_id = person.get_id()
                    noise_lat = np.random.randint(-100, 100) / 500000
                    noise_lon = np.random.randint(-100, 100) / 500000
                    lat += noise_lat
                    lon += noise_lon

                    f.write('"{}"\t"21"\t"data"\t""\t"{}"\t"beaconArrival"\t"{}"\t"{}"\t"{}"\n'.format(person_id, place,
                        lat, lon, outtime))

            timer.tick_minutes(15)
            times = timer.get_time()
            timeOfDay = time.mktime((2018, 10, times[0], times[1], times[2], 00, 0, 0, -1))
            outtime = time.strftime("%Y-%m-%d %H:%M:%S.000", time.localtime(timeOfDay))

