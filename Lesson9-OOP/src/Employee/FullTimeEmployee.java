package Employee;

public class FullTimeEmployee extends Employee {

    private double pay = 0;

    @Override
    public double getPay() {
        if (pay > 0) {
            return pay;
        } else {
            totalPay += hours * rate;
            pay=hours*rate;
            return hours * rate;
        }
    }

}
