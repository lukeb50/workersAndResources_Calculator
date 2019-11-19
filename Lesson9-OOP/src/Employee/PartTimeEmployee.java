package Employee;

public class PartTimeEmployee extends Employee{
    private double pay=0;
    final int OT=40;//how many hours they must work to qualify for OT, legally 44
    @Override
    public double getPay() {
        if(pay>0){
            return pay;
        }else{
            if(hours>OT){
                //OT
                totalPay+=(OT*rate)+((hours-OT)*(rate*1.5));
                pay=(OT*rate)+((hours-OT)*(rate*1.5));
                return (OT*rate)+((hours-OT)*(rate*1.5));
            }else{
                //no OT
                pay=hours*rate;
                totalPay+=hours*rate;
                return hours*rate;
            }
        }
    }
    
}
